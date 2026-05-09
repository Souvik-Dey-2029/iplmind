import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "data", "learning_memory.json");

let memoryState = {
  playerPopularity: {},        // playerName -> count of times picked
  playerDifficulty: {},        // playerName -> count of times AI missed
  questionEffectiveness: {},   // questionId -> { successes, total, avgEntropyDrop }
  confusionClusters: {},       // "playerA|playerB" -> count of confusions
  failedSessions: [],          // Last 50 failed sessions for analysis
  totalGames: 0,
  totalSuccesses: 0,
  totalFailures: 0,
};

const MAX_FAILED_SESSIONS = 50;

// Initialize memory on load
export async function initLearningMemory() {
  try {
    if (!fs.existsSync(path.dirname(MEMORY_FILE))) {
      fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
    }

    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, "utf-8");
      memoryState = { ...memoryState, ...JSON.parse(data) };
    } else {
      saveMemory();
    }
  } catch (error) {
    console.error("[learningMemory] Failed to init memory", error);
  }
}

/** Save memory state to disk */
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(memoryState, null, 2));
  } catch (error) {
    console.error("[learningMemory] Failed to save memory", error);
  }
}

/**
 * Record a successful game — player was guessed correctly.
 * Stores which questions led to convergence for boosting.
 */
export function recordSuccess(playerName, questions) {
  memoryState.totalGames++;
  memoryState.totalSuccesses++;

  if (playerName) {
    memoryState.playerPopularity[playerName] =
      (memoryState.playerPopularity[playerName] || 0) + 1;
  }

  // Track which questions contributed to a successful guess
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

  saveMemory();
}

/**
 * Record a failed game — AI guessed wrong or gave up.
 * Stores the full session for learning analysis.
 */
export function recordFailure(correctPlayerName, questionHistory = [], guessedPlayerName = null) {
  memoryState.totalGames++;
  memoryState.totalFailures++;

  if (correctPlayerName) {
    const key = correctPlayerName.toLowerCase().trim();
    memoryState.playerDifficulty[key] =
      (memoryState.playerDifficulty[key] || 0) + 1;
  }

  // Track confusion clusters — which players does the AI confuse?
  if (guessedPlayerName && correctPlayerName && guessedPlayerName !== correctPlayerName) {
    const clusterKey = [guessedPlayerName, correctPlayerName].sort().join("|");
    memoryState.confusionClusters[clusterKey] =
      (memoryState.confusionClusters[clusterKey] || 0) + 1;
  }

  // Store failed session for future training (capped at 50)
  memoryState.failedSessions.push({
    correctPlayer: correctPlayerName,
    guessedPlayer: guessedPlayerName,
    questions: questionHistory.map((q) => ({
      questionId: q.questionId,
      category: q.category,
      answer: q.answer,
    })),
    timestamp: new Date().toISOString(),
  });

  // Keep only the most recent failed sessions
  if (memoryState.failedSessions.length > MAX_FAILED_SESSIONS) {
    memoryState.failedSessions = memoryState.failedSessions.slice(-MAX_FAILED_SESSIONS);
  }

  // Penalize questions that were used in failed sessions
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

  saveMemory();
}

/**
 * Get prior probability boosts for players based on gameplay history.
 * Popular players get a slight boost. Difficult/missed players get an exposure boost
 * so the AI tries harder to identify them.
 */
export function getPlayerPriors(players) {
  const priors = {};
  const total = memoryState.totalGames || 1;

  players.forEach((p) => {
    const name = p.name;
    const normalized = name.toLowerCase().trim();

    const popularityScore = (memoryState.playerPopularity[name] || 0) / total;
    const difficultyScore = (memoryState.playerDifficulty[normalized] || 0) / total;

    // Active modern players get a base boost
    const activeBoost = p.active ? 0.3 : 0;

    // Base prior is 1.0. Popularity adds up to 0.5. Difficulty adds up to 1.0.
    // Active players get +0.3 to prioritize current squad members.
    priors[name] = 1.0 + (popularityScore * 0.5) + (difficultyScore * 1.0) + activeBoost;
  });

  return priors;
}

/**
 * Get dynamic boosts for questions that are proven effective.
 * A question is "effective" if it appears more in successful games.
 */
export function getQuestionBoost(questionId) {
  const entry = memoryState.questionEffectiveness[questionId];
  if (!entry || entry.total === 0) return 1.0;

  // Success rate: what fraction of games using this question ended in success?
  const successRate = entry.successes / entry.total;

  // Boost effective questions by up to 25%, penalize ineffective ones down to 0.8
  return 0.8 + (successRate * 0.45);
}

/**
 * Detect stagnation: returns true if the reasoning engine is stuck.
 * Checks if entropy has plateaued or top candidates haven't changed.
 */
export function detectStagnation(entropyHistory, confidenceHistory) {
  if (entropyHistory.length < 3) return false;

  // Check last 3 entropy values — if they're all very close, we're stagnating
  const recent = entropyHistory.slice(-3);
  const maxDelta = Math.max(
    Math.abs(recent[0] - recent[1]),
    Math.abs(recent[1] - recent[2])
  );

  // If entropy is barely moving (< 0.1 bits change across 3 answers), flag stagnation
  if (maxDelta < 0.1) return true;

  // Check confidence — if it hasn't grown in 3 questions, flag stagnation
  if (confidenceHistory.length >= 3) {
    const recentConf = confidenceHistory.slice(-3);
    const confGrowth = recentConf[2] - recentConf[0];
    if (confGrowth < 1.0) return true; // Less than 1% confidence growth over 3 questions
  }

  return false;
}

/**
 * Get session analytics summary for debugging and learning.
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
    recentFailures: memoryState.failedSessions.slice(-5),
  };
}

// Call init immediately in Node environments
if (typeof window === "undefined") {
  initLearningMemory();
}

