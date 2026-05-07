/**
 * Probability Engine - Bayesian updating system for narrowing down IPL players.
 * Each player starts with equal probability, and scores are updated after every answer.
 */

/**
 * Initialize equal probabilities for all players.
 * Returns a Map of player name -> probability score.
 */
export function initializeProbabilities(players) {
  const equalProb = 1.0 / players.length;
  const probabilities = {};
  players.forEach((player) => {
    probabilities[player.name] = equalProb;
  });
  return probabilities;
}

/**
 * Update probabilities using Bayesian-style scoring.
 * matchScores: object mapping player names to how well they match (0.0 to 1.0).
 * Returns updated, normalized probabilities.
 */
export function updateProbabilities(currentProbabilities, matchScores) {
  const updated = {};
  let totalScore = 0;

  // Multiply current probability by match likelihood
  for (const playerName in currentProbabilities) {
    const prior = currentProbabilities[playerName];
    // Default to 0.5 (neutral) if no score provided
    const likelihood = matchScores[playerName] ?? 0.5;
    // Keep a tiny floor so contradictions are effectively eliminated without
    // risking an all-zero distribution if the user misclicks once.
    const adjustedLikelihood = Math.max(likelihood, 0.000001);
    updated[playerName] = prior * adjustedLikelihood;
    totalScore += updated[playerName];
  }

  // Normalize so all probabilities sum to 1.0
  if (totalScore > 0) {
    for (const playerName in updated) {
      updated[playerName] = updated[playerName] / totalScore;
    }
  }

  return updated;
}

/**
 * Get players sorted by probability (highest first).
 * Returns array of { name, probability } objects.
 */
export function getRankedPlayers(probabilities) {
  return Object.entries(probabilities)
    .map(([name, probability]) => ({ name, probability }))
    .sort((a, b) => b.probability - a.probability);
}

/**
 * Get the top candidate and their confidence percentage.
 */
export function getTopCandidate(probabilities) {
  const ranked = getRankedPlayers(probabilities);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  // Confidence is how much the top candidate stands above the rest
  const confidence = top.probability * 100;

  return {
    name: top.name,
    confidence: Math.min(confidence, 100),
    probability: top.probability,
  };
}

/**
 * Check if confidence threshold is met for making a guess.
 * Returns true if the top candidate has >= threshold% confidence.
 */
export function shouldGuess(probabilities, threshold = 80, minimumViableCandidates = 1) {
  const top = getTopCandidate(probabilities);
  if (!top) return false;

  // Also check relative confidence: top should be significantly ahead
  const ranked = getRankedPlayers(probabilities);
  if (ranked.length <= minimumViableCandidates) return true;

  const relativeConfidence = ranked[0].probability / ranked[1].probability;

  // Guess if absolute confidence is high OR top is 5x more likely than #2
  return top.confidence >= threshold || relativeConfidence >= 5;
}

/**
 * Filter out players with very low probabilities (< 0.1% of top).
 * Returns the remaining viable candidates.
 */
export function getViableCandidates(players, probabilities, minRatio = 0.001) {
  const top = getTopCandidate(probabilities);
  if (!top) return players;

  return players.filter((player) => {
    const prob = probabilities[player.name] || 0;
    return prob >= top.probability * minRatio;
  });
}

/**
 * Calculate Shannon entropy of the probability distribution.
 * Lower entropy = more certain about the answer.
 */
export function calculateEntropy(probabilities) {
  let entropy = 0;
  for (const playerName in probabilities) {
    const p = probabilities[playerName];
    if (p > 0) {
      entropy -= p * Math.log2(p);
    }
  }
  return entropy;
}
