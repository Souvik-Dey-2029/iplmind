/**
 * Probability Engine - Bayesian updating system for narrowing down IPL players.
 * Each player starts with equal probability, and scores are updated after every answer.
 *
 * V2 OVERHAUL:
 * - Gradient scoring replaces binary kill (soft elimination)
 * - Entropy-based confidence smoothing prevents fake 100%
 * - Progressive confidence: requires more evidence before high confidence
 * - Uncertainty tolerance: "Maybe" and "Don't Know" nudge, don't slam
 * - Learning Memory Priors: applies historical difficulty weights
 */

import { getPlayerPriors } from "./learningMemory.js";

/**
 * Scale likelihood with meaningful differentiation.
 * V3: Much wider spread than V2 to prevent probability stagnation.
 * V2 was compressing [0,1] into [0.15,0.85] — only a 5.67x ratio.
 * V3 uses [0.05, 0.95] — a 19x ratio, creating real movement per answer.
 */
function adjustLikelihood(likelihood) {
  if (likelihood < 0.15) return 0.05;  // Strong mismatch — aggressive decay
  if (likelihood < 0.35) return 0.20;  // Moderate mismatch
  if (likelihood < 0.65) return 0.50;  // True neutral
  if (likelihood < 0.85) return 0.80;  // Moderate match
  return 0.95;                          // Strong match — strong boost
}

/**
 * Initialize probabilities for all players using historical priors.
 * Returns a Map of player name -> probability score.
 */
function calibrateBayesianLikelihood(adjustedLikelihood, rawLikelihood) {
  if (rawLikelihood < 0.10) return 0.015;
  if (rawLikelihood < 0.25) return Math.min(adjustedLikelihood, 0.08);
  if (rawLikelihood < 0.42) return Math.min(adjustedLikelihood, 0.24);
  if (rawLikelihood < 0.58) return 0.50;
  if (rawLikelihood < 0.75) return Math.max(adjustedLikelihood, 0.76);
  if (rawLikelihood < 0.90) return Math.max(adjustedLikelihood, 0.92);
  return 0.985;
}

export function initializeProbabilities(players) {
  const priors = getPlayerPriors(players);
  let totalPrior = 0;
  
  players.forEach(p => {
    totalPrior += (priors[p.name] || 1.0) * getSemanticPriorMultiplier(p);
  });

  const probabilities = {};
  players.forEach((player) => {
    probabilities[player.name] = ((priors[player.name] || 1.0) * getSemanticPriorMultiplier(player)) / totalPrior;
  });
  return probabilities;
}

function getSemanticPriorMultiplier(player) {
  const rarity = player.obscurityProfile?.rarity || player.rarity || "rare";
  // V5 FAIRNESS: Famous players get dampened priors so they don't dominate
  // before a single question is asked. Obscure players get lifted.
  const rarityLift = {
    common: 0.88,              // Famous icons — actively dampened
    uncommon: 0.94,            // Well-known but not dominant
    rare: 1.0,                 // Baseline
    epic: 1.08,                // Hard to guess — slight boost
    legendary: 1.14,           // Very hard — meaningful boost
    "legendary-obscure": 1.18, // Extremely hard — strong boost
    forgotten: 1.16,           // Forgotten players deserve visibility
    niche: 1.10,               // Niche specialists
  }[rarity] || 1;
  const weakRecallLift = player.questionAttributes?.underdog || player.questionAttributes?.domesticSpecialist ? 1.06 : 1;
  return rarityLift * weakRecallLift;
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
    const bayesianLikelihood = calibrateBayesianLikelihood(adjustedLikelihood, likelihood);

    // Keep a tiny floor so contradictions do not crash
    const finalLikelihood = Math.max(bayesianLikelihood, 0.0005);
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
 * Get the top candidate with TRUE DYNAMIC confidence scoring.
 * Prevents confidence from freezing by constantly evolving based on information gain.
 */
export function getTopCandidate(probabilities, questionCount = 1) {
  const ranked = getRankedPlayers(probabilities);
  if (ranked.length === 0) return null;

  const top = ranked[0];
  const runnerUp = ranked[1];

  // 1. Absolute Bayesian Probability
  const rawScore = top.probability * 100;

  // 2. Relative Separation (How dominant is #1 vs #2?)
  const separation = runnerUp ? Math.max(0, (top.probability - runnerUp.probability) / top.probability) : 1;

  // 3. System Entropy
  const entropy = calculateEntropy(probabilities);
  const maxEntropy = Math.log2(Object.keys(probabilities).length || 1);
  const entropyRatio = maxEntropy > 0 ? entropy / maxEntropy : 0;
  const entropyFactor = 1 - entropyRatio;

  // 4. Evolving Evidence Curve
  const evidenceMultiplier = Math.min(1, Math.log10(questionCount + 1) / Math.log10(16));

  // 5. V5 FAIRNESS: Ambiguity penalty — if top 3-5 candidates are clustered,
  // confidence should be suppressed regardless of raw probability.
  const top5 = ranked.slice(0, 5);
  let ambiguityPenalty = 1;
  if (top5.length >= 3) {
    const topProb = top5[0].probability;
    const clustered = top5.filter(c => c.probability > topProb * 0.4).length;
    if (clustered >= 3) ambiguityPenalty = 0.82;  // 3+ candidates clustered = suppress confidence
    if (clustered >= 4) ambiguityPenalty = 0.72;  // 4+ = strong suppression
  }

  // Blended Confidence Formula
  let blendedConfidence = (
    (rawScore * 0.3) +
    (separation * 100 * 0.35) +
    (entropyFactor * 100 * 0.35)
  ) * evidenceMultiplier * ambiguityPenalty;

  // V5: Reduced per-question inflation from 0.15 to 0.10
  blendedConfidence += (questionCount * 0.10);

  const confidence = Math.max(0, Math.min(98.9, blendedConfidence));

  return {
    name: top.name,
    confidence,
    probability: Math.max(0, Math.min(1, top.probability)),
    separation,
    entropy,
    ambiguityPenalty,
  };
}

/**
 * Check if confidence threshold is met for making a guess.
 * V2: Much more conservative — requires strong evidence across multiple signals.
 */
export function shouldGuess(probabilities, threshold = 70, minimumViableCandidates = 1, questionCount = 10) {
  const top = getTopCandidate(probabilities, questionCount);
  if (!top) return false;

  const ranked = getRankedPlayers(probabilities);
  if (ranked.length <= minimumViableCandidates) return true;

  const relativeConfidence = ranked[0].probability / ranked[1].probability;

  // V5 FAIRNESS: Require stronger separation before guessing.
  // This prevents the engine from jumping to Dhoni/Kohli/Gayle on thin evidence.
  // Also require minimum question count to prevent premature guesses.
  const minQuestionsBeforeGuess = 6;
  if (questionCount < minQuestionsBeforeGuess) return false;

  return (
    top.confidence >= threshold &&
    relativeConfidence >= 3.0 &&    // Was 2.5 — now requires stronger dominance
    top.separation >= 0.35           // Was 0.3 — slightly tighter
  );
}

/**
 * Filter out players with very low probabilities.
 * V2: More conservative pruning — keeps more candidates alive longer.
 */
export function getViableCandidates(players, probabilities, minRatio = 0.05) {
  const top = getTopCandidate(probabilities);
  if (!top) return players;

  return players.filter((player) => {
    const prob = probabilities[player.name] || 0;
    if (prob < 0.0001) return false;

    // V5 FAIRNESS: Long-tail survival floor.
    // Rare/obscure players get a lower elimination threshold so they survive longer.
    const rarity = player.obscurityProfile?.rarity || player.rarity || "rare";
    const isLongTail = ["epic", "legendary", "legendary-obscure", "forgotten", "niche"].includes(rarity);
    const effectiveMinRatio = isLongTail ? minRatio * 0.4 : minRatio;  // 0.02 vs 0.05

    return prob >= top.probability * effectiveMinRatio;
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
