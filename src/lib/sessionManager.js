/**
 * Session Manager - handles game session state on the server side.
 * Stores active sessions in memory (could be moved to Redis for production scaling).
 *
 * V2 OVERHAUL:
 * - Continue-after-wrong-guess: resume session, exclude wrong player
 * - Progressive confidence thresholds: must ask 8+ questions before guessing
 * - Failure flow: "I couldn't guess" after max questions
 * - Excluded players tracking for wrong guesses
 * - Stabilized session lifecycle
 */

import { v4 as uuidv4 } from "uuid";
import { players } from "@/data/players";
import {
  initializeProbabilities,
  updateProbabilities,
  getTopCandidate,
  shouldGuess,
  getViableCandidates,
  calculateEntropy,
  normalizeProbabilities,
} from "./probabilityEngine";
import { evaluateDeterministicAnswer } from "./answerEvaluator";
import { evaluateCandidates, generateGuessExplanation, generateAdaptiveQuestion } from "./aiProvider";
import { evaluateQuestionAnswer, selectBestQuestion } from "./questionEngine";
import { sanitizePlayerForRender } from "./playerNormalizer";
import { recordSuccess, recordFailure, detectStagnation, recordQuestionEntropyImpact } from "./learningMemory";
import { validateQuestion } from "./questionValidation";
import { determinePhase } from "./reasoningPhaseManager";
import { buildInferredFacts, validateCandidateAgainstFacts } from "./semanticConstraints";
import {
  applySemanticReranking,
  calculateSemanticConfidence,
  evaluateSemanticAnswer,
  getSemanticDifficulty,
  validateFinalGuess,
} from "./semanticInference";

// In-memory session store shared across route module instances in the same server process.
const sessions = globalThis.__IPLMIND_SESSIONS__ || new Map();
globalThis.__IPLMIND_SESSIONS__ = sessions;

// ═══════════════════════════════════════════════
// V2: TUNED GAME CONSTANTS
// ═══════════════════════════════════════════════
const CONFIDENCE_THRESHOLD = 72;        // Raised from 65 — requires stronger evidence
const MIN_CANDIDATES_TO_GUESS = 2;
const MIN_QUESTIONS_BEFORE_GUESS = 8;   // Raised from 3 — prevents rushing
const INITIAL_ADAPTIVE_LIMIT = 14;      // Raised from 12
const MAX_TOTAL_QUESTIONS = 30;         // Raised from 28
const MAX_WRONG_GUESSES = 3;            // Allow up to 3 wrong guesses before giving up

// Lightweight atomic update mechanism to prevent concurrent corruption
const sessionLocks = new Map();

// Automatic session cleanup timer (runs every 30 minutes)
let cleanupTimer = null;

/**
 * Initialize background cleanup task.
 * Removes sessions older than 1 hour from memory.
 * Called once at module load to set up periodic cleanup.
 */
function initializeSessionCleanup() {
  if (cleanupTimer) return; // Already initialized

  cleanupTimer = setInterval(() => {
    cleanupSessions();
  }, 30 * 60 * 1000); // Run every 30 minutes

  // Unref timer so it doesn't prevent process exit
  if (cleanupTimer.unref) cleanupTimer.unref();
}

// Initialize cleanup on module load
if (typeof globalThis !== "undefined") {
  initializeSessionCleanup();
}

// Lightweight async lock to prevent double-click / concurrent corruption

function acquireLock(sessionId) {
  if (sessionLocks.get(sessionId)) return false;
  sessionLocks.set(sessionId, true);
  return true;
}

function releaseLock(sessionId) {
  sessionLocks.delete(sessionId);
}

/**
 * Create a new game session with all players equally weighted.
 */
export function createSession() {
  const sessionId = uuidv4();
  const probabilities = initializeProbabilities(players);

  const session = {
    id: sessionId,
    probabilities,
    candidates: [...players],
    questionHistory: [], // Array of { question, answer }
    entropyHistory: [calculateEntropy(probabilities)],
    confidenceHistory: [],
    questionNumber: 0,
    adaptiveQuestionLimit: INITIAL_ADAPTIVE_LIMIT,
    maxTotalQuestions: MAX_TOTAL_QUESTIONS,
    minQuestionsBeforeGuess: MIN_QUESTIONS_BEFORE_GUESS,
    status: "playing", // playing | guessing | continue | finished | failed
    guess: null,
    guessHistory: [],           // V2: Track all guesses made
    excludedPlayers: new Set(), // V2: Players excluded after wrong guesses
    wrongGuessCount: 0,         // V2: How many wrong guesses so far
    currentQuestion: null,
    currentQuestionMeta: null,
    createdAt: Date.now(),
    historyStack: [],           // V3: Immutable snapshots for undo (max 20 deep)
  };

  sessions.set(sessionId, session);
  return session;
}

/**
 * Get an existing session by ID.
 */
export function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

/**
 * V3: Undo the last answer — restore exact previous engine snapshot.
 * Pops from historyStack and replaces current state entirely.
 * No recalculation, no regeneration — pure snapshot restoration.
 */
export function undoLastAnswer(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  if (!session.historyStack || session.historyStack.length === 0) {
    return { canUndo: false, error: "No history to undo" };
  }

  // Pop the latest snapshot
  const snapshot = session.historyStack.pop();

  // Restore EXACT previous state
  session.candidates = snapshot.candidates;
  session.probabilities = snapshot.probabilities;
  session.questionHistory = snapshot.questionHistory;
  session.entropyHistory = snapshot.entropyHistory;
  session.confidenceHistory = snapshot.confidenceHistory;
  session.questionNumber = snapshot.questionNumber;
  session.currentQuestion = snapshot.currentQuestion;
  session.currentQuestionMeta = snapshot.currentQuestionMeta;
  session.status = snapshot.status;
  session.guess = snapshot.guess;
  session.wrongGuessCount = snapshot.wrongGuessCount;
  session.excludedPlayers = snapshot.excludedPlayers;
  session.isStagnating = snapshot.isStagnating;

  // Get display data from restored state
  const ranked = getDisplayCandidates(session).slice(0, 5);

  return {
    canUndo: true,
    status: "playing",
    question: session.currentQuestion,
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
    topCandidates: ranked,
    entropy: session.entropyHistory.at(-1) || 0,
    confidence: session.confidenceHistory.at(-1) || 0,
    adaptiveQuestionLimit: session.adaptiveQuestionLimit,
    wrongGuessCount: session.wrongGuessCount,
    canUndoMore: session.historyStack.length > 0,
    debugReasoningPanel: buildDebugReasoningPanel(session),
    commentary: "⏪ Rewound! Let's try that again...",
  };
}

/**
 * Process a user's answer and update the session state.
 * Returns the updated session with next question or guess.
 */
export async function processAnswer(sessionId, answer) {
  if (!acquireLock(sessionId)) throw new Error("Concurrent request in progress");
  
  try {
    const session = sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status !== "playing") throw new Error("Game is not in playing state");

  const currentQuestion = session.currentQuestion;
  if (!currentQuestion) throw new Error("No current question to answer");

  // V3: Capture exact snapshot BEFORE applying any mutations
  const snapshot = {
    candidates: [...session.candidates],
    probabilities: { ...session.probabilities },
    questionHistory: [...session.questionHistory],
    entropyHistory: [...session.entropyHistory],
    confidenceHistory: [...session.confidenceHistory],
    questionNumber: session.questionNumber,
    currentQuestion: session.currentQuestion,
    currentQuestionMeta: session.currentQuestionMeta ? { ...session.currentQuestionMeta } : null,
    status: session.status,
    guess: session.guess,
    wrongGuessCount: session.wrongGuessCount,
    excludedPlayers: new Set(session.excludedPlayers),
    isStagnating: session.isStagnating || false,
  };
  session.historyStack.push(snapshot);
  // Cap at 20 snapshots to prevent memory bloat
  if (session.historyStack.length > 20) {
    session.historyStack.shift();
  }

  // Record the Q&A
  session.questionHistory.push({
    question: currentQuestion,
    answer: answer,
    questionId: session.currentQuestionMeta?.id,
    category: session.currentQuestionMeta?.category,
  });

  // Prefer the structured question predicate. Legacy/Gemini parsing remains a
  // fallback for older sessions or manually injected question text.
  let matchScores =
    evaluateQuestionAnswer(session.candidates, session.currentQuestionMeta, answer) ||
    evaluateSemanticAnswer(session.candidates, session.currentQuestionMeta, answer) ||
    evaluateDeterministicAnswer(session.candidates, currentQuestion, answer);

  // AI fallback: only use if deterministic methods returned null
  if (!matchScores) {
    try {
      matchScores = await evaluateCandidates(session.candidates, currentQuestion, answer);
    } catch (err) {
      console.warn("[sessionManager] AI evaluation failed, using neutral scores:", err.message);
      // Fallback: neutral scores so game continues gracefully
      matchScores = {};
      session.candidates.forEach((p) => { matchScores[p.name] = 0.5; });
    }
  }

  // Update probabilities using Bayesian updating
  session.probabilities = updateProbabilities(session.probabilities, matchScores);
  session.probabilities = applySemanticReranking(session.probabilities, players, session.questionHistory);

  // Filter out very unlikely candidates (but respect excluded players)
  session.candidates = getViableCandidates(players, session.probabilities, 0.05, session.questionNumber)
    .filter((p) => !session.excludedPlayers.has(p.name));

  const previousEntropy = session.entropyHistory.at(-1) || calculateEntropy(snapshot.probabilities);
  const nextEntropy = calculateEntropy(session.probabilities);
  session.entropyHistory.push(nextEntropy);
  recordQuestionEntropyImpact(
    session.currentQuestionMeta?.id,
    previousEntropy - nextEntropy,
    extractSemanticTraitsFromQuestionMeta(session.currentQuestionMeta)
  );
  session.confidenceHistory.push(
    calculateSemanticConfidence(session.probabilities, players, session.questionHistory, session.questionNumber)?.confidence ||
    getTopCandidate(session.probabilities, session.questionNumber)?.confidence ||
    0
  );

  // Stagnation detection — flag session if reasoning is stuck
  session.isStagnating = detectStagnation(session.entropyHistory, session.confidenceHistory);

  session.questionNumber++;

  // Check if we should make a guess
  const confidentEnough = shouldMakeFinalGuess(session);

  if (confidentEnough) {
    return await makeGuess(session);
  }

  // Check if we've exhausted all questions
  if (session.questionNumber >= session.maxTotalQuestions) {
    return handleFailure(session);
  }

  // Generate the next question
    return generateNextQuestion(session);
  } finally {
    releaseLock(sessionId);
  }
}

/**
 * V3: Make a guess attempt with semantic validation.
 * Validates the top candidate against inferred facts before committing.
 */
async function makeGuess(session) {
  session.status = "guessing";

  // Build inferred facts to validate candidate
  const inferredFacts = buildInferredFacts(session.questionHistory);

  // Find top candidate, excluding previously wrong guesses
  // AND validating against semantic constraints
  const topCandidate = getTopValidatedCandidate(session, inferredFacts);

  if (!topCandidate) {
    return handleFailure(session);
  }

  const playerData = sanitizePlayerForRender(players.find((p) => p.name === topCandidate.name));

  if (!playerData || !playerData.name) {
    return handleFailure(session);
  }

  const rawPlayerData = players.find((p) => p.name === topCandidate.name);
  const finalValidation = validateFinalGuess(
    rawPlayerData,
    session.probabilities,
    players,
    session.questionHistory,
    session.questionNumber
  );

  if (!finalValidation.valid && session.questionNumber < session.maxTotalQuestions - 2 && (session.semanticGuessDeferrals || 0) < 2) {
    session.status = "playing";
    session.semanticGuessDeferrals = (session.semanticGuessDeferrals || 0) + 1;
    session.probabilities[topCandidate.name] = (session.probabilities[topCandidate.name] || 0) * 0.72;
    session.probabilities = normalizeProbabilities(session.probabilities);
    return generateNextQuestion(session);
  }

  // Get AI explanation for the guess
  let explanation = "";
  try {
    explanation = await generateGuessExplanation(playerData, session.questionHistory);
  } catch (err) {
    console.warn("Failed to generate explanation, using fallback", err);
    explanation = buildFallbackExplanation(playerData, session.questionHistory);
  }

  // Confidence smoothing: cap at 97% for realism, apply uncertainty penalty
  const rawConfidence = topCandidate.confidence;
  const semanticConfidence = finalValidation.semantic?.confidence || rawConfidence;
  const smoothedConfidence = Math.min(Math.min(rawConfidence, semanticConfidence) * finalValidation.confidencePenalty, 97);

  session.guess = {
    player: playerData,
    confidence: smoothedConfidence,
    probability: topCandidate.probability,
    explanation: explanation || "",
    guessNumber: session.wrongGuessCount + 1,
    semanticValidation: {
      alignment: finalValidation.alignment,
      contradictionPenalty: finalValidation.contradictionPenalty,
      reasons: finalValidation.reasons,
    },
  };

  // Track guess in history
  session.guessHistory.push({
    playerName: playerData.name,
    confidence: smoothedConfidence,
    questionNumber: session.questionNumber,
  });

  return {
    status: "guessing",
    guess: session.guess,
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
    confidence: smoothedConfidence,
    wrongGuessCount: session.wrongGuessCount,
    maxWrongGuesses: MAX_WRONG_GUESSES,
    debugReasoningPanel: buildDebugReasoningPanel(session),
  };
}

/**
 * V2: Continue game after wrong guess.
 * Excludes the wrong player, resumes questioning.
 */
export async function continueAfterWrongGuess(sessionId) {
  if (!acquireLock(sessionId)) throw new Error("Concurrent request in progress");
  
  try {
    const session = sessions.get(sessionId);
    if (!session) throw new Error("Session not found");
    if (session.status !== "guessing") throw new Error("Game is not in guessing state");

  session.wrongGuessCount++;

  // Check if we've exceeded max wrong guesses
  if (session.wrongGuessCount >= MAX_WRONG_GUESSES) {
    return handleFailure(session);
  }

  // Exclude the wrong player from future consideration
  const wrongPlayerName = session.guess?.player?.name;
  if (wrongPlayerName) {
    session.excludedPlayers.add(wrongPlayerName);

    // Zero out the wrong player's probability
    session.probabilities[wrongPlayerName] = 0;

    // Remove from candidates
    session.candidates = session.candidates.filter((p) => p.name !== wrongPlayerName);
  }

  // Re-normalize probabilities after exclusion
  const total = Object.values(session.probabilities).reduce((s, v) => s + v, 0);
  if (total > 0) {
    for (const name in session.probabilities) {
      session.probabilities[name] /= total;
    }
  }

  // Increase adaptive limit to allow more questions
  session.adaptiveQuestionLimit = Math.min(
    session.adaptiveQuestionLimit + 5,
    session.maxTotalQuestions
  );

  // Resume playing
  session.status = "playing";
  session.guess = null;

    return generateNextQuestion(session);
  } finally {
    releaseLock(sessionId);
  }
}

/**
 * V2: Handle failure — AI couldn't determine the player.
 */
function handleFailure(session) {
  session.status = "failed";
  return {
    status: "failed",
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
    topCandidates: getDisplayCandidates(session).slice(0, 5),
    message: "I couldn't determine your player this time.",
    wrongGuessCount: session.wrongGuessCount,
    debugReasoningPanel: buildDebugReasoningPanel(session),
  };
}

/**
 * Generate the next question for the session.
 */
async function generateNextQuestion(session) {
  // AI Adaptive Questioning: triggers for small pools OR when reasoning stagnates
  const shouldUseAI = (session.candidates.length <= 15 && session.candidates.length > 1) || session.isStagnating;
  if (shouldUseAI) {
      try {
          const aiQuestion = await generateAdaptiveQuestion(session.candidates, session.questionHistory);
          if (aiQuestion && validateQuestion(aiQuestion)) {
             session.currentQuestion = aiQuestion;
             session.currentQuestionMeta = null; // Mark as dynamic AI question (evaluated via evaluateCandidates)
             
             return {
                status: "playing",
                question: aiQuestion,
                questionNumber: session.questionNumber,
                candidatesRemaining: session.candidates.length,
                topCandidates: getDisplayCandidates(session).slice(0, 5),
                entropy: session.entropyHistory.at(-1) || 0,
                confidence: session.confidenceHistory.at(-1) || 0,
                adaptiveQuestionLimit: session.adaptiveQuestionLimit,
                wrongGuessCount: session.wrongGuessCount,
                canUndo: (session.historyStack?.length || 0) > 0,
                debugReasoningPanel: buildDebugReasoningPanel(session),
                commentary: generateCommentary(session),
                analysisHints: generateAnalysisHints(session),
                suspectedTeam: detectSuspectedTeam(session),
              };
          } else {
             console.warn("[sessionManager] AI generated invalid or complex question. Falling back.");
          }
      } catch (error) {
          console.warn("[sessionManager] AI adaptive questioning failed, falling back to deterministic", error);
      }
  }

  const nextQuestionMeta = selectBestQuestion(
    session.candidates,
    session.probabilities,
    session.questionHistory
  );
  const nextQuestion = nextQuestionMeta?.text;

  if (!nextQuestion) {
    // If no more questions can be generated, force a guess or fail
    if (session.candidates.length > 0) {
      return makeGuess(session);
    }
    return handleFailure(session);
  }

  session.currentQuestion = nextQuestion;
  session.currentQuestionMeta = stripQuestionPredicate(nextQuestionMeta);

  // Get top 5 candidates for display (normalize field naming)
  const ranked = getDisplayCandidates(session).slice(0, 5);

  return {
    status: "playing",
    question: nextQuestion,
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
    topCandidates: ranked,
    entropy: session.entropyHistory.at(-1) || 0,
    confidence: session.confidenceHistory.at(-1) || 0,
    adaptiveQuestionLimit: session.adaptiveQuestionLimit,
    wrongGuessCount: session.wrongGuessCount,
    canUndo: (session.historyStack?.length || 0) > 0,
    debugReasoningPanel: buildDebugReasoningPanel(session),
    commentary: generateCommentary(session),
    analysisHints: generateAnalysisHints(session),
    suspectedTeam: detectSuspectedTeam(session),
  };
}

function generateCommentary(session) {
  const qNum = session.questionNumber;
  const conf = session.confidenceHistory.at(-1) || 0;
  const prevConf = session.confidenceHistory.at(-2) || 0;
  const cands = session.candidates.length;
  const lastAnswer = session.questionHistory.at(-1)?.answer;
  const lastQ = session.questionHistory.at(-1)?.question?.toLowerCase() || "";

  // Early game warmup
  if (qNum === 1) return "Let's see if I can read your mind... 🏏";
  if (qNum === 2) return "Good, narrowing it down... 🔍";
  
  // Candidate-count reactions
  if (cands === 1) return "I know exactly who this is! 🤯";
  if (cands <= 3) return "Only a few legends fit this description! 🏆";
  
  // Confidence-driven reactions
  if (conf > 85 && conf - prevConf > 15) return "That changes everything! I think I've got it 🔥";
  if (conf > 80) return "I'm very close now... 👀";
  if (conf > 60 && prevConf < 40) return "Wait — that's a massive clue! 💡";
  if (conf > 60) return "Getting a clear picture now... 🧠";
  
  // Shock reactions
  if (lastAnswer === "No" && prevConf > 70 && conf < 50) return "Really? That surprised me! 😵 Let me rethink...";
  if (lastAnswer === "No" && prevConf > 50) return "Hmm, not what I expected... 🤔";
  
  // Contextual reactions based on question topic
  if (lastAnswer === "Yes" && lastQ.includes("captain")) return "A captain! That narrows it significantly ⚡";
  if (lastAnswer === "Yes" && lastQ.includes("overseas")) return "Overseas player... scanning international profiles 🌍";
  if (lastAnswer === "Yes" && lastQ.includes("india")) return "Indian player — that's a huge pool, need more clues 🇮🇳";
  if (lastAnswer === "Yes" && lastQ.includes("spinner")) return "A spinner! Let me check the spin wizards 🌀";
  if (lastAnswer === "Yes" && lastQ.includes("pace")) return "A pacer! Analyzing speed demons 💨";
  if (lastAnswer === "Yes" && lastQ.includes("wicketkeeper")) return "A keeper! That really narrows things down 🧤";
  if (lastAnswer === "Yes" && lastQ.includes("opener")) return "An opener! Checking the top-order specialists 🏏";
  if (lastAnswer === "Yes" && lastQ.includes("finisher")) return "A finisher! The pressure players... 🎯";
  
  // Stagnation detection
  if (qNum > 15 && conf < 30) return "You've picked a really tricky one... 🤔";
  if (qNum > 12 && conf < 20) return "This is a tough one! Let me dig deeper... 💪";
  
  // Mid-game flavor with variety
  const midFlavors = [
    "Interesting... let me think about this.",
    "Okay, building the profile... 📋",
    "Good answer. Narrowing down. 🎯",
    "Noted! Let me refine my analysis... 🧠",
    "Hmm, interesting clue... 🔍",
    "Processing... connecting the dots. ⚡",
  ];
  return midFlavors[qNum % midFlavors.length];
}

/**
 * Generate contextual "AI Mind Scan" analysis hints.
 * Returns an array of 3 rotating messages that adapt to the current game state.
 */
function generateAnalysisHints(session) {
  const hints = [];
  const history = session.questionHistory;
  const cands = session.candidates.length;
  const lastQ = history.at(-1);
  const lastAnswer = lastQ?.answer;
  const lastCategory = lastQ?.category || "";
  const lastId = lastQ?.questionId || "";

  // Always show scanning count
  hints.push(`Scanning ${cands} player profiles...`);

  // Contextual hints based on last question answered
  if (lastId === "batsman" && lastAnswer === "Yes") hints.push("Filtering batting specialists...");
  else if (lastId === "batsman" && lastAnswer === "No") hints.push("Eliminating pure batsmen...");
  else if (lastId === "bowler" && lastAnswer === "Yes") hints.push("Analyzing bowling attack data...");
  else if (lastId === "bowler" && lastAnswer === "No") hints.push("Removing bowling-only candidates...");
  else if (lastId === "allrounder" && lastAnswer === "Yes") hints.push("Checking all-rounder profiles...");
  else if (lastId === "wicketkeeper" && lastAnswer === "Yes") hints.push("Filtering wicketkeeper legends...");
  else if (lastId === "overseas" && lastAnswer === "Yes") hints.push("Scanning international registries...");
  else if (lastId === "indian" && lastAnswer === "Yes") hints.push("Processing Indian player database...");
  else if (lastId === "spinner" && lastAnswer === "Yes") hints.push("Evaluating spin bowling data...");
  else if (lastId === "pacer" && lastAnswer === "Yes") hints.push("Analyzing pace bowling metrics...");
  else if (lastId === "captain" && lastAnswer === "Yes") hints.push("Evaluating captaincy records...");
  else if (lastId === "opener" && lastAnswer === "Yes") hints.push("Checking opening partnership stats...");
  else if (lastId === "finisher" && lastAnswer === "Yes") hints.push("Analyzing death-over strike rates...");
  else if (lastId === "orange-cap" && lastAnswer === "Yes") hints.push("Verifying Orange Cap winners...");
  else if (lastId === "purple-cap" && lastAnswer === "Yes") hints.push("Verifying Purple Cap winners...");
  else if (lastId === "left-handed" && lastAnswer === "Yes") hints.push("Filtering left-handed batsmen...");
  else if (lastId.startsWith("current-team:")) hints.push(`Cross-referencing ${lastId.replace("current-team:", "")} roster...`);
  else if (lastId.startsWith("country:")) hints.push(`Checking ${lastId.replace("country:", "")} player registry...`);
  else if (lastCategory === "franchise-history") hints.push("Scanning franchise transfer history...");
  else hints.push("Cross-referencing player attributes...");

  // Third hint based on confidence/phase
  const conf = session.confidenceHistory.at(-1) || 0;
  if (conf > 75) hints.push("High confidence match detected ⚡");
  else if (conf > 50) hints.push("Building candidate profile...");
  else if (cands < 10) hints.push("Deep-analyzing remaining candidates...");
  else if (cands < 30) hints.push("Narrowing search parameters...");
  else hints.push("Running probability calculations...");

  return hints.slice(0, 3);
}

/**
 * Detect the dominant team among top candidates for atmosphere adaptation.
 * Returns null if no team dominates (>50% of top candidates).
 */
function detectSuspectedTeam(session) {
  const topNames = getDisplayCandidates(session).slice(0, 5);
  if (topNames.length === 0) return null;

  const teamCounts = {};
  for (const c of topNames) {
    const player = players.find(p => p.name === c.name);
    const team = player?.currentTeam || player?.teams?.at?.(-1);
    if (team) teamCounts[team] = (teamCounts[team] || 0) + 1;
  }

  const sorted = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 3) return sorted[0][0]; // 3+ of 5 = dominant
  return null;
}

/**
 * Generate the first question for a new session.
 */
export async function getFirstQuestion(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");

  const questionMeta = selectBestQuestion(session.candidates, session.probabilities, []);
  const question = questionMeta.text;

  session.currentQuestion = question;
  session.currentQuestionMeta = stripQuestionPredicate(questionMeta);
  return question;
}

function stripQuestionPredicate(questionMeta) {
  const { predicate, yesProbability, noProbability, informationGain, score, ...serializable } = questionMeta;
  return serializable;
}

function extractSemanticTraitsFromQuestionMeta(meta) {
  if (!meta) return [];
  return [
    meta.id?.startsWith("semantic:") ? meta.id.replace("semantic:", "") : "",
    meta.category,
    meta.value,
  ].filter(Boolean);
}

/**
 * Record feedback when the AI's guess was wrong.
 */
export function recordFeedback(sessionId, correctPlayerName) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "finished";
  session.correctPlayer = correctPlayerName || "";
  session.wasCorrect = false;

  // Record failure in learning memory with guessed player for confusion tracking
  if (correctPlayerName) {
    const guessedPlayer = session.guess?.player?.name || null;
    recordFailure(correctPlayerName, session.questionHistory, guessedPlayer);
  }

  // Return data for Firebase storage
  return {
    sessionId,
    questions: session.questionHistory,
    guessedPlayer: session.guess?.player?.name,
    guessHistory: session.guessHistory || [],
    correctPlayer: correctPlayerName || "",
    wasCorrect: false,
    wrongGuessCount: session.wrongGuessCount,
    questionsAsked: session.questionNumber,
    semanticDifficulty: getSemanticDifficulty(players.find((p) => p.name === correctPlayerName), session.questionNumber),
    rarity: players.find((p) => p.name === correctPlayerName)?.obscurityProfile?.rarity || "",
    timestamp: Date.now(),
  };
}

/**
 * Mark the AI's guess as correct.
 */
export function confirmGuess(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "finished";
  session.wasCorrect = true;

  // Record success in learning memory
  const guessedPlayer = session.guess?.player?.name;
  if (guessedPlayer) {
    recordSuccess(guessedPlayer, session.questionHistory);
  }

  return {
    sessionId,
    questions: session.questionHistory,
    guessedPlayer: guessedPlayer,
    guessHistory: session.guessHistory || [],
    wasCorrect: true,
    wrongGuessCount: session.wrongGuessCount,
    questionsAsked: session.questionNumber,
    semanticDifficulty: getSemanticDifficulty(players.find((p) => p.name === guessedPlayer), session.questionNumber),
    rarity: players.find((p) => p.name === guessedPlayer)?.obscurityProfile?.rarity || "",
    timestamp: Date.now(),
  };
}

/**
 * V2: Record feedback for failure flow (player reveal after giving up).
 */
export function recordFailureFeedback(sessionId, correctPlayerName) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "finished";
  session.correctPlayer = correctPlayerName || "";
  session.wasCorrect = false;

  // Record failure in learning memory with guessed player for confusion tracking
  if (correctPlayerName) {
    const guessedPlayer = session.guess?.player?.name || null;
    recordFailure(correctPlayerName, session.questionHistory, guessedPlayer);
  }

  return {
    sessionId,
    questions: session.questionHistory,
    guessHistory: session.guessHistory || [],
    correctPlayer: correctPlayerName || "",
    wasCorrect: false,
    failed: true,
    wrongGuessCount: session.wrongGuessCount,
    questionsAsked: session.questionNumber,
    semanticDifficulty: getSemanticDifficulty(players.find((p) => p.name === correctPlayerName), session.questionNumber),
    rarity: players.find((p) => p.name === correctPlayerName)?.obscurityProfile?.rarity || "",
    timestamp: Date.now(),
  };
}

/**
 * Clean up old sessions (older than 1 hour).
 */
export function cleanupSessions() {
  const oneHourAgo = Date.now() - 3600000;
  for (const [id, session] of sessions) {
    if (session.createdAt < oneHourAgo) {
      sessions.delete(id);
    }
  }
}

/**
 * V2: Progressive confidence-based guessing.
 * The longer the game goes, the MORE confident we need to be (not less).
 * This prevents premature guessing while allowing late-game rescue guesses.
 */
function shouldMakeFinalGuess(session) {
  const semanticTop = calculateSemanticConfidence(session.probabilities, players, session.questionHistory, session.questionNumber);
  // Safety gate: never allow infinite questioning.
  if (session.questionNumber >= session.maxTotalQuestions) {
    return true;
  }

  // V2: Enforce minimum questions — never guess before 8 questions
  if (session.questionNumber < session.minQuestionsBeforeGuess) return false;

  // Progressive threshold: rises with question count, then softens at the end
  const progressiveThreshold = getProgressiveThreshold(session.questionNumber);

  // Primary: strong separation / confidence signal.
  if (
    semanticTop &&
    semanticTop.confidence >= progressiveThreshold &&
    semanticTop.separation >= 0.28 &&
    semanticTop.semanticAlignment >= 0.42
  ) {
    return true;
  }

  if (shouldGuess(session.probabilities, progressiveThreshold + 4, MIN_CANDIDATES_TO_GUESS, session.questionNumber)) {
    return true;
  }

  // Secondary: very small candidate pool (≤2 players left).
  const top = semanticTop || getTopCandidate(session.probabilities, session.questionNumber);
  if (session.candidates.length <= MIN_CANDIDATES_TO_GUESS && (top?.confidence || 0) >= 50) {
    return true;
  }

  // Adaptive: allow gradual increase, but keep it bounded by the hard cap.
  if (session.questionNumber >= session.adaptiveQuestionLimit) {
    if (top && (top?.confidence || 0) >= 45) {
      return true;
    }

    // Increase the adaptive limit but never beyond maxTotalQuestions.
    const next = session.adaptiveQuestionLimit + 4;
    session.adaptiveQuestionLimit = Math.min(next, session.maxTotalQuestions);
  }

  return false;
}

/**
 * V2: Progressive confidence threshold.
 * Questions 8-12: need 72% confidence
 * Questions 13-18: need 65% confidence (more evidence gathered)
 * Questions 19-25: need 55% confidence (softening for rescue)
 * Questions 26+: need 40% confidence (last chance)
 */
function getProgressiveThreshold(questionNumber) {
  if (questionNumber <= 12) return 72;
  if (questionNumber <= 18) return 65;
  if (questionNumber <= 25) return 55;
  return 40;
}

/**
 * V3: Get top candidate validated against both exclusion list AND semantic constraints.
 * Candidates that contradict inferred facts get heavy probability penalties.
 */
function getTopValidatedCandidate(session, inferredFacts) {
  const ranked = Object.entries(session.probabilities)
    .filter(([name]) => !session.excludedPlayers.has(name))
    .map(([name, prob]) => {
      // Apply semantic validation penalty
      const player = players.find((p) => p.name === name);
      const validationPenalty = player ? validateCandidateAgainstFacts(player, inferredFacts) : 1.0;
      return [name, prob * validationPenalty];
    })
    .sort((a, b) => b[1] - a[1]);

  if (ranked.length === 0) return null;

  return getTopCandidate(
    Object.fromEntries(ranked),
    session.questionNumber
  );
}

function getDisplayCandidates(session) {
  const viableNames = new Set(session.candidates.map((player) => player.name));
  // Compute top candidates by probability directly (no external dependency)
  const topByProbability = [];
  for (const [name, prob] of Object.entries(session.probabilities)) {
    if (viableNames.has(name) && !session.excludedPlayers.has(name)) {
      // Store as probability (0-1) not confidence (0-100) for API consistency
      topByProbability.push({ name, probability: prob });
    }
  }
  topByProbability.sort((a, b) => b.probability - a.probability);

  return topByProbability.map((candidate) => {
    const player = sanitizePlayerForRender(players.find((p) => p.name === candidate.name));
    return {
      id: player?.canonicalPlayerId || player?.id || candidate.name,
      name: player?.name || candidate.name,
      probability: candidate.probability,
      rarity: player?.obscurityProfile?.rarity || player?.rarity || "",
      archetype: player?.playerDNA?.tacticalIdentity || player?.archetype || "",
      player: player || null,
    };
  });
}

/**
 * V2: Build a fallback explanation without AI.
 */
function buildFallbackExplanation(playerData, questionHistory) {
  const matchedTraits = [];

  for (const qa of questionHistory) {
    if (qa.answer?.toLowerCase() === "yes") {
      const q = qa.question?.toLowerCase() || "";
      if (q.includes("batter") || q.includes("batsman")) matchedTraits.push("batter");
      if (q.includes("bowler")) matchedTraits.push("bowler");
      if (q.includes("all-rounder")) matchedTraits.push("all-rounder");
      if (q.includes("wicketkeeper") || q.includes("keeper")) matchedTraits.push("wicketkeeper");
      if (q.includes("captain")) matchedTraits.push("captain");
      if (q.includes("overseas")) matchedTraits.push("overseas player");
      if (q.includes("indian") || q.includes("india")) matchedTraits.push("Indian player");
      if (q.includes("opener")) matchedTraits.push("opener");
      if (q.includes("finisher")) matchedTraits.push("finisher");
      if (q.includes("spinner") || q.includes("spin")) matchedTraits.push("spinner");
      if (q.includes("pace") || q.includes("fast")) matchedTraits.push("pace bowler");
      if (q.includes("iconic")) matchedTraits.push("iconic IPL figure");
    }
  }

  const team = playerData.latestSeasonTeam || playerData.currentTeam || playerData.teams?.[playerData.teams.length - 1];
  const parts = [
    ...new Set(matchedTraits),
    team ? `associated with ${team}` : null,
  ].filter(Boolean);

  if (parts.length === 0) {
    return `${playerData.name} — matched through the process of elimination.`;
  }

  return `${playerData.name} — ${parts.join(", ")}.`;
}

function buildDebugReasoningPanel(session) {
  const topCandidates = getDisplayCandidates(session).slice(0, 5);
  const currentMeta = session.currentQuestionMeta || null;
  const latestEntropy = session.entropyHistory.at(-1) || 0;
  const previousEntropy = session.entropyHistory.at(-2) || latestEntropy;
  const semanticTop = calculateSemanticConfidence(session.probabilities, players, session.questionHistory, session.questionNumber);

  return {
    canonicalCandidates: topCandidates.map(({ player, probability }) => ({
      canonicalPlayerId: player?.canonicalPlayerId || player?.id || "",
      name: player?.name || "",
      originalRawSource: player?.originalRawSource || null,
      normalizationResult: player?.normalizationResult || null,
      probability,
    })),
    questionCategory: currentMeta?.category || "",
    entropyScore: latestEntropy,
    entropyDelta: previousEntropy - latestEntropy,
    eliminationReasoning: {
      candidatesRemaining: session.candidates.length,
      confidence: session.confidenceHistory.at(-1) || 0,
      threshold: getProgressiveThreshold(session.questionNumber),
      adaptiveQuestionLimit: session.adaptiveQuestionLimit,
      wrongGuessCount: session.wrongGuessCount,
      excludedPlayers: [...session.excludedPlayers],
      phase: determinePhase(session.candidates.length, session.questionNumber),
      isStagnating: session.isStagnating || false,
      semanticTopCandidate: semanticTop?.name || "",
      semanticAlignment: semanticTop?.semanticAlignment || 0,
      dnaSpread: semanticTop?.dnaSpread || 0,
      contradictionDensity: semanticTop?.contradictionDensity || 0,
      semanticGuessDeferrals: session.semanticGuessDeferrals || 0,
    },
    confidenceEvolution: session.confidenceHistory,
  };
}
