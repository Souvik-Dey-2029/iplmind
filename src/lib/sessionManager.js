/**
 * Session Manager - handles game session state on the server side.
 * Stores active sessions in memory (could be moved to Redis for production scaling).
 */

import { v4 as uuidv4 } from "uuid";
import { players } from "@/data/players";
import {
  initializeProbabilities,
  updateProbabilities,
  getTopCandidate,
  shouldGuess,
  getViableCandidates,
  getRankedPlayers,
  calculateEntropy,
} from "./probabilityEngine";
import { evaluateDeterministicAnswer } from "./answerEvaluator";
import { evaluateCandidates, generateGuessExplanation } from "./gemini";
import { evaluateQuestionAnswer, selectBestQuestion } from "./questionEngine";

// In-memory session store (maps sessionId -> session data)
const sessions = new Map();

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
    questionNumber: 0,
    maxQuestions: 8,
    minQuestionsBeforeGuess: 5,
    status: "playing", // playing | guessing | finished
    guess: null,
    createdAt: Date.now(),
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
 * Process a user's answer and update the session state.
 * Returns the updated session with next question or guess.
 */
export async function processAnswer(sessionId, answer) {
  const session = sessions.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.status !== "playing") throw new Error("Game is not in playing state");

  const currentQuestion = session.currentQuestion;
  if (!currentQuestion) throw new Error("No current question to answer");

  // Record the Q&A
  session.questionHistory.push({
    question: currentQuestion,
    answer: answer,
    questionId: session.currentQuestionMeta?.id,
    category: session.currentQuestionMeta?.category,
  });

  // Prefer the structured question predicate. Legacy/Gemini parsing remains a
  // fallback for older sessions or manually injected question text.
  const matchScores =
    evaluateQuestionAnswer(session.candidates, session.currentQuestionMeta, answer) ||
    evaluateDeterministicAnswer(session.candidates, currentQuestion, answer) ||
    (await evaluateCandidates(session.candidates, currentQuestion, answer));

  // Update probabilities using Bayesian updating
  session.probabilities = updateProbabilities(session.probabilities, matchScores);

  // Filter out very unlikely candidates
  session.candidates = getViableCandidates(players, session.probabilities);
  session.entropyHistory.push(calculateEntropy(session.probabilities));

  session.questionNumber++;

  // Check if we should make a guess
  const confidentEnough =
    session.questionNumber >= session.minQuestionsBeforeGuess &&
    shouldGuess(session.probabilities, 75, 3);

  if (confidentEnough || session.questionNumber >= session.maxQuestions) {
    session.status = "guessing";
    const topCandidate = getTopCandidate(session.probabilities);
    const playerData = players.find((p) => p.name === topCandidate.name);

    // Get AI explanation for the guess
    const explanation = await generateGuessExplanation(playerData, session.questionHistory);

    session.guess = {
      player: playerData,
      confidence: topCandidate.confidence,
      explanation,
    };

    return {
      status: "guessing",
      guess: session.guess,
      questionNumber: session.questionNumber,
      candidatesRemaining: session.candidates.length,
    };
  }

  // Generate the next question
  const nextQuestionMeta = selectBestQuestion(
    session.candidates,
    session.probabilities,
    session.questionHistory
  );
  const nextQuestion = nextQuestionMeta.text;

  session.currentQuestion = nextQuestion;
  session.currentQuestionMeta = stripQuestionPredicate(nextQuestionMeta);

  // Get top 3 candidates for display
  const ranked = getRankedPlayers(session.probabilities).slice(0, 3);

  return {
    status: "playing",
    question: nextQuestion,
    questionNumber: session.questionNumber,
    candidatesRemaining: session.candidates.length,
    topCandidates: ranked,
    entropy: session.entropyHistory.at(-1),
  };
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

/**
 * Record feedback when the AI's guess was wrong.
 */
export function recordFeedback(sessionId, correctPlayerName) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  session.status = "finished";
  session.correctPlayer = correctPlayerName;
  session.wasCorrect = false;

  // Return data for Firebase storage
  return {
    sessionId,
    questions: session.questionHistory,
    guessedPlayer: session.guess?.player?.name,
    correctPlayer: correctPlayerName,
    wasCorrect: false,
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

  return {
    sessionId,
    questions: session.questionHistory,
    guessedPlayer: session.guess?.player?.name,
    wasCorrect: true,
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
