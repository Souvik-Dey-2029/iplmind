/**
 * Probability Engine - Bayesian updating system for narrowing down IPL players.
 * Each player starts with equal probability, and scores are updated after every answer.
 *
 * V2 OVERHAUL:
 * - Gradient scoring replaces binary kill (soft elimination)
 * - Entropy-based confidence smoothing prevents fake 100%
 * - Progressive confidence: requires more evidence before high confidence
 * - Uncertainty tolerance: "Maybe" and "Don't Know" nudge, don't slam
 */

/**
 * Scale likelihood smoothly with uncertainty tolerance.
 * Key change: eliminates the hard 0.0001 floor that caused instant death.
 * Now uses sigmoid-like mapping that keeps eliminated players barely alive
 * so they can recover if later answers contradict.
 */
function adjustLikelihood(likelihood) {
  // Strong mismatch (< 0.15): heavy penalty but survivable
  if (likelihood < 0.15) {
    // Map [0, 0.15) → [0.03, 0.08] — punished but not dead
    return 0.03 + (likelihood / 0.15) * 0.05;
  }

  // Moderate mismatch (0.15 - 0.35): notable penalty
  if (likelihood < 0.35) {
    // Map [0.15, 0.35) → [0.08, 0.25]
    return 0.08 + ((likelihood - 0.15) / 0.2) * 0.17;
  }

  // Uncertain zone (0.35 - 0.65): very gentle nudge
  if (likelihood < 0.65) {
    // Map [0.35, 0.65) → [0.25, 0.75] — near-neutral
    return 0.25 + ((likelihood - 0.35) / 0.3) * 0.5;
  }

  // Moderate match (0.65 - 0.85): moderate boost
  if (likelihood < 0.85) {
    // Map [0.65, 0.85) → [0.75, 0.92]
    return 0.75 + ((likelihood - 0.65) / 0.2) * 0.17;
  }

  // Strong match (>= 0.85): confident boost
  // Map [0.85, 1.0] → [0.92, 1.0]
  return 0.92 + ((likelihood - 0.85) / 0.15) * 0.08;
}

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
    let likelihood = matchScores[playerName] ?? 0.5;
    // Clamp likelihood to valid range [0, 1]
    likelihood = Math.max(0, Math.min(1, likelihood));
    // Apply smooth likelihood adjustment for stable confidence scaling
    const adjustedLikelihood = adjustLikelihood(likelihood);

    // Keep a tiny floor so contradictions do not crash
    const finalLikelihood = Math.max(adjustedLikelihood, 0.001);
    updated[playerName] = prior * finalLikelihood;
    totalScore += updated[playerName];
  }

  // Normalize so all probabilities sum to 1.0
  if (totalScore > 0) {
    for (const playerName in updated) {
      updated[playerName] = updated[playerName] / totalScore;
      // Extra safety: clamp to [0, 1] after normalization
      updated[playerName] = Math.max(0, Math.min(1, updated[playerName]));
    }
  }

  return updated;
}

export function normalizeProbabilities(probabilities) {
  const total = Object.values(probabilities).reduce((sum, value) => sum + value, 0);
  if (!total) return probabilities;

  const normalized = Object.fromEntries(
    Object.entries(probabilities).map(([name, probability]) => {
      // Clamp to valid probability range [0, 1]
      const clamped = Math.max(0, Math.min(1, probability / total));
      return [name, clamped];
    })
  );

  return normalized;
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
 * Get the top candidate with REALISTIC confidence scoring.
 *
 * V2: Confidence is no longer just `probability * 100`.
 * Instead it factors in:
 * 1. Relative separation from runner-up (how far ahead the leader is)
 * 2. Absolute probability (raw Bayesian score)
 * 3. Entropy of the remaining distribution (how "decided" the distribution is)
 *
 * This prevents fake 100% after 2-3 questions.
 */
export function getTopCandidate(probabilities) {
  const ranked = getRankedPlayers(probabilities);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  const runnerUp = ranked[1];

  // Factor 1: Raw Bayesian probability (0-100 range)
  const rawScore = top.probability * 100;

  // Factor 2: Separation from runner-up
  const separation = runnerUp ? (top.probability - runnerUp.probability) / top.probability : 1;

  // Factor 3: Entropy-based scaling — high entropy = low confidence
  const entropy = calculateEntropy(probabilities);
  const maxEntropy = Math.log2(Object.keys(probabilities).length);
  const entropyRatio = maxEntropy > 0 ? entropy / maxEntropy : 0;
  // entropyFactor: 0 (max entropy, total uncertainty) → 1 (zero entropy, total certainty)
  const entropyFactor = 1 - entropyRatio;

  // Blended confidence: weighted combination of all three factors
  // This makes confidence rise gradually and honestly
  const blendedConfidence = (
    rawScore * 0.4 +          // Raw probability matters
    separation * 100 * 0.3 +  // How far ahead of #2
    entropyFactor * 100 * 0.3 // Overall distribution certainty
  );

  // Apply smoothing cap: never exceed 97% to acknowledge uncertainty
  const confidence = Math.max(0, Math.min(97, blendedConfidence));

  return {
    name: top.name,
    confidence,
    probability: Math.max(0, Math.min(1, top.probability)),
    separation: separation,
    entropy,
  };
}

/**
 * Check if confidence threshold is met for making a guess.
 * V2: Much more conservative — requires strong evidence across multiple signals.
 */
export function shouldGuess(probabilities, threshold = 70, minimumViableCandidates = 1) {
  const top = getTopCandidate(probabilities);
  if (!top) return false;

  // Also check relative confidence: top should be significantly ahead
  const ranked = getRankedPlayers(probabilities);
  if (ranked.length <= minimumViableCandidates) return true;

  const relativeConfidence = ranked[0].probability / ranked[1].probability;

  // V2: Require BOTH high absolute confidence AND strong separation
  // Plus check that separation is meaningful (not just rounding noise)
  return (
    top.confidence >= threshold &&
    relativeConfidence >= 2.5 &&
    top.separation >= 0.3
  );
}

/**
 * Filter out players with very low probabilities.
 * V2: More conservative pruning — keeps more candidates alive longer.
 */
export function getViableCandidates(players, probabilities, minRatio = 0.02) {
  const top = getTopCandidate(probabilities);
  if (!top) return players;

  return players.filter((player) => {
    const prob = probabilities[player.name] || 0;
    // V2: Softer elimination threshold
    if (prob < 0.0005) return false;
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
