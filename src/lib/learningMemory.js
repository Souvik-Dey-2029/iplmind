/**
 * Learning Memory — Persistent Global Intelligence System
 * 
 * V3: Hybrid local + Firebase Firestore persistence.
 * - Local in-memory cache for fast reads during gameplay
 * - Async Firestore sync for global persistence across deployments
 * - Falls back gracefully to local-only if Firebase is unavailable
 */

import { adminDb } from "./firebaseAdmin";

// In-memory cache (fast reads during gameplay)
let memoryState = {
  playerPopularity: {},        // playerName -> count of times picked
  playerDifficulty: {},        // playerName -> count of times AI missed
  questionEffectiveness: {},   // questionId -> { successes, total }
  questionEntropyImpact: {},   // questionId -> { totalDelta, count }
  semanticTraitEffectiveness: {}, // trait -> { totalDelta, count }
  confusionClusters: {},       // "playerA|playerB" -> count of confusions
  overcollapseEvents: {},      // "guessed|correct" -> count of famous-over-obscure collapses
  totalGames: 0,
  totalSuccesses: 0,
  totalFailures: 0,
  lastSyncedAt: null,
};

const FIRESTORE_COLLECTION = "learning_memory";
const FIRESTORE_DOC_ID = "global_state";
let initialized = false;

/**
 * Initialize memory — load from Firestore if available, else start fresh.
 */
export async function initLearningMemory() {
  if (initialized) return;
  initialized = true;

  try {
    if (adminDb) {
      const doc = await adminDb.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC_ID).get();
      if (doc.exists) {
        const data = doc.data();
        memoryState = { ...memoryState, ...data };
        console.log("[learningMemory] Loaded global state from Firestore");
      } else {
        await syncToFirestore();
        console.log("[learningMemory] Created new Firestore document");
      }
    } else {
      console.log("[learningMemory] Firebase unavailable — using in-memory only");
    }
  } catch (error) {
    console.warn("[learningMemory] Firestore init failed, using in-memory:", error.message);
  }
}

/**
 * Async sync to Firestore (fire-and-forget, non-blocking).
 */
async function syncToFirestore() {
  if (!adminDb) return;
  try {
    memoryState.lastSyncedAt = new Date().toISOString();
    await adminDb.collection(FIRESTORE_COLLECTION).doc(FIRESTORE_DOC_ID).set(memoryState, { merge: true });
  } catch (error) {
    console.warn("[learningMemory] Firestore sync failed:", error.message);
  }
}

/**
 * Record a successful game — player was guessed correctly.
 */
export function recordSuccess(playerName, questions) {
  memoryState.totalGames++;
  memoryState.totalSuccesses++;

  if (playerName) {
    memoryState.playerPopularity[playerName] =
      (memoryState.playerPopularity[playerName] || 0) + 1;
  }

  // Track which questions contributed to a successful guess
  if (questions) {
    questions.forEach((q) => {
      if (q.questionId) {
        const entry = memoryState.questionEffectiveness[q.questionId] || {
          successes: 0,
          total: 0,
        };
        entry.successes++;
        entry.total++;
        memoryState.questionEffectiveness[q.questionId] = entry;
      }
    });
  }

  // Non-blocking persist
  syncToFirestore();
}

/**
 * Record a failed game — AI guessed wrong or gave up.
 */
export function recordFailure(correctPlayerName, questionHistory = [], guessedPlayerName = null) {
  memoryState.totalGames++;
  memoryState.totalFailures++;

  if (correctPlayerName) {
    const key = correctPlayerName.toLowerCase().trim();
    memoryState.playerDifficulty[key] =
      (memoryState.playerDifficulty[key] || 0) + 1;
  }

  // Track confusion clusters
  if (guessedPlayerName && correctPlayerName && guessedPlayerName !== correctPlayerName) {
    const clusterKey = [guessedPlayerName, correctPlayerName].sort().join("|");
    memoryState.confusionClusters[clusterKey] =
      (memoryState.confusionClusters[clusterKey] || 0) + 1;
    
    // V5 FAIRNESS: Track overcollapse events — when AI guessed a famous player
    // but the correct answer was someone else. This feeds back into prior dampening.
    const overcollapseKey = `${guessedPlayerName}|${correctPlayerName}`;
    memoryState.overcollapseEvents = memoryState.overcollapseEvents || {};
    memoryState.overcollapseEvents[overcollapseKey] =
      (memoryState.overcollapseEvents[overcollapseKey] || 0) + 1;
  }

  // Penalize questions that were used in failed sessions
  if (questionHistory) {
    questionHistory.forEach((q) => {
      if (q.questionId) {
        const entry = memoryState.questionEffectiveness[q.questionId] || {
          successes: 0,
          total: 0,
        };
        entry.total++;
        memoryState.questionEffectiveness[q.questionId] = entry;
      }
    });
  }

  // Store failure in Firestore for auto-enrichment pipeline
  if (adminDb && correctPlayerName) {
    adminDb.collection("failed_guesses").add({
      correctPlayer: correctPlayerName,
      guessedPlayer: guessedPlayerName || null,
      questionCount: questionHistory?.length || 0,
      timestamp: new Date().toISOString(),
    }).catch(() => {}); // fire-and-forget
  }

  // Non-blocking persist
  syncToFirestore();
}

/**
 * Get prior probability boosts for players based on gameplay history.
 * Popular players get a slight boost. Difficult/missed players get an exposure boost.
 */
export function getPlayerPriors(players) {
  const priors = {};
  const total = memoryState.totalGames || 1;

  // V5 FAIRNESS: Count how many times each player was the AI's wrong guess.
  // Players who are frequently over-guessed get their prior dampened.
  const overguessCount = {};
  for (const [key, count] of Object.entries(memoryState.overcollapseEvents || {})) {
    const guessedName = key.split("|")[0];
    overguessCount[guessedName] = (overguessCount[guessedName] || 0) + count;
  }

  players.forEach((p) => {
    const name = p.name;
    const normalized = name.toLowerCase().trim();

    const popularityScore = (memoryState.playerPopularity[name] || 0) / total;
    const difficultyScore = (memoryState.playerDifficulty[normalized] || 0) / total;

    // Active modern players get a base boost
    const activeBoost = p.active ? 0.3 : 0;

    // V5 FAIRNESS: Cap popularity contribution to prevent runaway famous-player priors.
    // Also apply overcollapse dampening — if the AI keeps wrongly guessing this player,
    // their prior gets penalized so the engine explores alternatives.
    const cappedPopularity = Math.min(popularityScore * 0.3, 0.15);  // Was 0.5, capped at 0.15
    const overguess = (overguessCount[name] || 0) / total;
    const overguessFloor = Math.max(-0.2, -overguess * 0.5);  // Penalize up to -0.2

    priors[name] = 1.0 + cappedPopularity + (difficultyScore * 1.0) + activeBoost + overguessFloor;
  });

  return priors;
}

/**
 * Get dynamic boosts for questions that are proven effective.
 */
export function getQuestionBoost(questionId) {
  const entry = memoryState.questionEffectiveness[questionId];
  const entropyEntry = memoryState.questionEntropyImpact[questionId];
  if (!entry && !entropyEntry) return 1.0;

  const successRate = entry?.total ? entry.successes / entry.total : 0.5;
  const avgEntropyDelta = entropyEntry?.count ? entropyEntry.totalDelta / entropyEntry.count : 0;
  // Boost effective questions by up to 25%, penalize ineffective ones to 0.8
  return Math.max(0.72, Math.min(1.42, 0.8 + (successRate * 0.35) + (avgEntropyDelta * 0.08)));
}

export function recordQuestionEntropyImpact(questionId, entropyDelta = 0, semanticTraits = []) {
  if (!questionId) return;

  const entry = memoryState.questionEntropyImpact[questionId] || { totalDelta: 0, count: 0 };
  entry.totalDelta += Math.max(-2, Math.min(2, entropyDelta));
  entry.count++;
  memoryState.questionEntropyImpact[questionId] = entry;

  semanticTraits.forEach((trait) => {
    const key = String(trait || "").toLowerCase().trim();
    if (!key) return;
    const traitEntry = memoryState.semanticTraitEffectiveness[key] || { totalDelta: 0, count: 0 };
    traitEntry.totalDelta += Math.max(-2, Math.min(2, entropyDelta));
    traitEntry.count++;
    memoryState.semanticTraitEffectiveness[key] = traitEntry;
  });

  syncToFirestore();
}

/**
 * Detect stagnation: returns true if the reasoning engine is stuck.
 */
export function detectStagnation(entropyHistory, confidenceHistory) {
  if (entropyHistory.length < 3) return false;

  const recent = entropyHistory.slice(-3);
  const maxDelta = Math.max(
    Math.abs(recent[0] - recent[1]),
    Math.abs(recent[1] - recent[2])
  );

  if (maxDelta < 0.1) return true;

  if (confidenceHistory.length >= 3) {
    const recentConf = confidenceHistory.slice(-3);
    const confGrowth = recentConf[2] - recentConf[0];
    if (confGrowth < 1.0) return true;
  }

  return false;
}

/**
 * Get session analytics summary.
 */
export function getAnalytics() {
  return {
    totalGames: memoryState.totalGames,
    totalSuccesses: memoryState.totalSuccesses,
    totalFailures: memoryState.totalFailures,
    successRate: memoryState.totalGames > 0
      ? ((memoryState.totalSuccesses / memoryState.totalGames) * 100).toFixed(1) + "%"
      : "N/A",
    mostDifficultPlayers: Object.entries(memoryState.playerDifficulty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    topConfusionClusters: Object.entries(memoryState.confusionClusters)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    lastSyncedAt: memoryState.lastSyncedAt,
  };
}

// Call init immediately in Node environments
if (typeof window === "undefined") {
  initLearningMemory();
}
