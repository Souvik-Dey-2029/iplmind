import { calculateEntropy, getRankedPlayers, normalizeProbabilities } from "./probabilityEngine";

const YES_SCORE = 0.96;
const NO_SCORE = 0.04;
const MAYBE_YES_SCORE = 0.62;
const MAYBE_NO_SCORE = 0.42;

const ID_TO_TAGS = {
  batsman: ["batsman"],
  bowler: ["bowler"],
  allrounder: ["all-rounder", "allrounder"],
  wicketkeeper: ["wicketkeeper", "wicket-keeper"],
  overseas: ["overseas", "overseas-player"],
  indian: ["india", "indian-player", "domestic"],
  iconic: ["iconic", "ipl-icon", "high-recall"],
  active: ["active", "active-player"],
  "founding-era": ["early-ipl-player", "earlyIPLera", "oldSchoolLegend"],
  veteran: ["long-career-player", "veteran", "oldSchoolLegend"],
  "recent-debut": ["post-2020-player", "post2020Player", "modernT20Specialist"],
  opener: ["opener", "topOrder"],
  "middle-order": ["middleOrder", "top-middle"],
  finisher: ["finisher", "death-over-batter"],
  "power-hitter": ["power-hitter", "aggressor", "six-hitter"],
  anchor: ["anchor", "accumulator", "stabilizer"],
  "left-handed": ["left-hander", "left-hand-bat"],
  spinner: ["spinner", "spin"],
  pacer: ["pacer", "pace-bowler"],
  "death-bowler": ["death-bowler", "death-over-bowler", "deathBowler"],
  captain: ["captain", "decision-maker", "leadership-presence"],
  "orange-cap": ["orange-cap-winner", "elite-run-scorer"],
  "purple-cap": ["purple-cap-winner", "elite-wicket-taker"],
  "playoffs-hero": ["playoffs-hero", "playoff-temperament", "clutch-player"],
  "fan-favorite": ["fan-favorite", "crowd-connect-player"],
  "one-team-player": ["one-franchise-player", "one-team-loyalist"],
  "title-winner": ["title-winner", "serial-winner"],
  "mystery-spin": ["mystery-spinner", "mysterySpinner"],
  "uncapped-domestic": ["domestic-specialist", "uncapped-or-domestic-indian", "low-profile-professional"],
  "ipl-specialist": ["ipl-specialist", "IPLSpecialist"],
  "dominated-2011-2015": ["goldenEraPlayer", "pre2015Peak"],
  "post-2020-player": ["post-2020-player", "post2020Player", "modernT20Specialist"],
  "journeyman-player": ["journeyman-player", "multi-franchise-journeyman"],
  "obscure-short-career": ["short-career-player", "very-short-ipl-career", "obscure"],
};

const TAG_CONTRADICTIONS = new Map([
  ["indian-player", ["overseas-player", "overseas"]],
  ["overseas-player", ["indian-player", "domestic"]],
  ["spinner", ["pacer", "pace-bowler"]],
  ["pacer", ["spinner", "mystery-spinner"]],
  ["opener", ["tail"]],
  ["early-ipl-player", ["post-2020-player", "modernT20Specialist"]],
  ["post-2020-player", ["early-ipl-player", "oldSchoolLegend"]],
]);

const TAG_WEIGHTS = new Map([
  ["captain", 1.25],
  ["wicketkeeper", 1.2],
  ["finisher", 1.2],
  ["death-over-batter", 1.25],
  ["death-over-bowler", 1.25],
  ["csk-icon", 1.45],
  ["mi-icon", 1.45],
  ["rcb-icon", 1.45],
  ["kkr-icon", 1.45],
  ["one-franchise-player", 1.25],
  ["mystery-spinner", 1.25],
  ["short-career-player", 1.3],
  ["very-short-ipl-career", 1.35],
  ["oldschoollegend", 1.25],
  ["post-2020-player", 1.15],
  ["goldeneraplayer", 1.2],
]);

export function buildSemanticProfile(history = []) {
  const positiveTags = new Set();
  const negativeTags = new Set();
  const confirmed = {};
  const rejected = {
    countries: new Set(),
    currentTeams: new Set(),
    teams: new Set(),
    tags: new Set(),
  };
  const answeredQuestionIds = new Set();

  history.forEach((entry) => {
    const answer = normalizeAnswer(entry.answer);
    const questionId = entry.questionId || "";
    if (!questionId || answer === "neutral") return;

    answeredQuestionIds.add(questionId);
    const traits = traitsFromQuestion(entry);
    const targetSet = answer === "no" ? negativeTags : positiveTags;
    const oppositeSet = answer === "no" ? positiveTags : negativeTags;
    const confidence = answer === "maybe" ? 0.5 : 1;

    for (const tag of traits.tags) {
      if (confidence >= 1) targetSet.add(tag);
      else positiveTags.add(`${tag}:soft`);
      if (answer === "no") rejected.tags.add(tag);
      for (const contrary of TAG_CONTRADICTIONS.get(tag) || []) {
        oppositeSet.add(contrary);
      }
    }

    if (traits.country) {
      if (answer === "yes") confirmed.country = traits.country;
      if (answer === "no") rejected.countries.add(traits.country);
    }
    if (traits.currentTeam) {
      if (answer === "yes") confirmed.currentTeam = traits.currentTeam;
      if (answer === "no") rejected.currentTeams.add(traits.currentTeam);
    }
    if (traits.team) {
      if (answer === "yes") confirmed.team = traits.team;
      if (answer === "no") rejected.teams.add(traits.team);
    }
    if (traits.semantic) {
      if (answer === "yes") positiveTags.add(traits.semantic);
      if (answer === "no") rejected.tags.add(traits.semantic);
    }
  });

  return {
    positiveTags,
    negativeTags,
    confirmed,
    rejected,
    answeredQuestionIds,
    density: positiveTags.size + negativeTags.size + rejected.tags.size,
  };
}

export function getPlayerSemanticTags(player) {
  return new Set(
    [
      player.role,
      player.country,
      player.currentTeam,
      player.strongestFranchiseAssociation,
      player.franchiseLoyalty,
      player.era,
      player.dominantEra,
      player.primaryRole,
      player.secondaryRole,
      player.questionAttributes?.franchiseIdentity,
      player.questionAttributes?.IPLSpecialist && "ipl-specialist",
      player.questionAttributes?.internationalStar && "international-star",
      player.questionAttributes?.domesticSpecialist && "domestic-specialist",
      player.questionAttributes?.cultPlayer && "cult-player",
      player.questionAttributes?.underdog && "underdog",
      player.questionAttributes?.oneSeasonWonder && "one-season-wonder",
      player.obscurityProfile?.rarity,
      ...(player.teams || []),
      ...(player.dnaTags || []),
      ...(player.tacticalTags || []),
      ...(player.semanticVector || []),
      ...(player.playerDNA?.playstyleEmbeddings || []),
      ...(player.playerDNA?.emotionalTags || []),
      ...(player.playerDNA?.historicalTags || []),
      ...(player.playerDNA?.pressureTraits || []),
      ...(player.obscurityProfile?.nicheIdentifiers || []),
      ...(player.obscurityProfile?.semanticDifferentiators || []),
      ...(player.performanceProfile?.statisticalIdentity || []),
    ]
      .filter(Boolean)
      .flatMap(expandTag)
      .map(normalizeTag)
      .filter(Boolean)
  );
}

export function getWeightedPlayerVector(player) {
  const vector = new Map();
  for (const tag of getPlayerSemanticTags(player)) {
    vector.set(tag, (vector.get(tag) || 0) + getTagWeight(tag));
  }
  return vector;
}

export function getInferredProfileVector(profile) {
  const vector = new Map();
  for (const tag of profile.positiveTags) {
    const clean = normalizeTag(tag.replace(/:soft$/, ""));
    const weight = getTagWeight(clean) * (tag.endsWith(":soft") ? 0.45 : 1);
    vector.set(clean, (vector.get(clean) || 0) + weight);
  }
  for (const tag of profile.negativeTags) {
    const clean = normalizeTag(tag);
    vector.set(`not-${clean}`, (vector.get(`not-${clean}`) || 0) + 0.55);
  }
  if (profile.confirmed.country) vector.set(normalizeTag(profile.confirmed.country), 1.15);
  if (profile.confirmed.currentTeam) vector.set(normalizeTag(profile.confirmed.currentTeam), 1.25);
  if (profile.confirmed.team) vector.set(normalizeTag(profile.confirmed.team), 1.1);
  return vector;
}

export function cosineSimilarity(left, right) {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const value of left.values()) leftNorm += value * value;
  for (const value of right.values()) rightNorm += value * value;
  for (const [key, value] of left.entries()) {
    dot += value * (right.get(key) || 0);
  }

  if (!leftNorm || !rightNorm) return 0;
  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

export function evaluateSemanticAnswer(candidates, questionMeta, answer) {
  const answerKind = normalizeAnswer(answer);
  if (!questionMeta || answerKind === "neutral") return null;

  const traits = traitsFromQuestion({
    questionId: questionMeta.id,
    category: questionMeta.category,
    value: questionMeta.value,
    question: questionMeta.text,
  });
  const tags = traits.tags.length ? traits.tags : traits.semantic ? [traits.semantic] : [];
  if (!tags.length && !traits.country && !traits.currentTeam && !traits.team) return null;

  return Object.fromEntries(
    candidates.map((player) => {
      const match = candidateMatchesTraits(player, traits, tags);
      const score = semanticAnswerScore(match, answerKind);
      return [player.name, score];
    })
  );
}

export function applySemanticReranking(probabilities, allPlayers, history = []) {
  const profile = buildSemanticProfile(history);
  if (profile.density === 0) return probabilities;

  const adjusted = {};
  for (const player of allPlayers) {
    const current = probabilities[player.name] || 0;
    if (!current) {
      adjusted[player.name] = 0;
      continue;
    }

    const alignment = calculateSemanticAlignment(player, profile);
    const contradictionPenalty = calculateContradictionPenalty(player, profile);
    const rarityMultiplier = getRarityMultiplier(player, profile);
    const rankingPrior = player.candidateRankingFeatures?.priorWeight || 1;
    const multiplier = Math.max(0.001, alignment * contradictionPenalty * rarityMultiplier * Math.sqrt(rankingPrior));
    adjusted[player.name] = current * multiplier;
  }

  return normalizeProbabilities(adjusted);
}

export function calculateSemanticAlignment(player, profile) {
  const playerTags = getPlayerSemanticTags(player);
  const profileVector = getInferredProfileVector(profile);
  const playerVector = getWeightedPlayerVector(player);
  const vectorSimilarity = cosineSimilarity(profileVector, playerVector);
  let positive = 0;
  let possiblePositive = 0;
  let negativeConflict = 0;

  for (const tag of profile.positiveTags) {
    possiblePositive += tag.endsWith(":soft") ? 0.45 : 1;
    const clean = normalizeTag(tag.replace(/:soft$/, ""));
    if (playerTags.has(clean)) positive += tag.endsWith(":soft") ? 0.35 : 1;
  }

  for (const tag of profile.negativeTags) {
    if (playerTags.has(normalizeTag(tag))) negativeConflict += 1;
  }

  const positiveRatio = possiblePositive ? positive / possiblePositive : 0.5;
  const blendedSimilarity = possiblePositive ? (positiveRatio * 0.58 + vectorSimilarity * 0.42) : vectorSimilarity;
  const base = 0.55 + blendedSimilarity * 1.75;
  const penalty = Math.pow(0.58, negativeConflict);
  return clamp(base * penalty, 0.08, 2.55);
}

export function calculateContradictionPenalty(player, profile) {
  let penalty = 1;

  if (profile.confirmed.country && player.country !== profile.confirmed.country) penalty *= 0.02;
  if (profile.confirmed.currentTeam && player.currentTeam !== profile.confirmed.currentTeam) penalty *= 0.08;
  if (profile.confirmed.team && !(player.teams || []).includes(profile.confirmed.team)) penalty *= 0.08;
  if (profile.rejected.countries.has(player.country)) penalty *= 0.06;
  if (profile.rejected.currentTeams.has(player.currentTeam)) penalty *= 0.08;

  const tags = getPlayerSemanticTags(player);
  for (const rejected of profile.rejected.tags) {
    if (tags.has(normalizeTag(rejected))) penalty *= 0.45;
  }

  return clamp(penalty, 0.001, 1);
}

export function calculateSemanticConfidence(probabilities, players, history, questionCount = 1) {
  const ranked = getRankedPlayers(probabilities);
  if (!ranked.length) return null;

  const profile = buildSemanticProfile(history);
  const top = ranked[0];
  const runnerUp = ranked[1];
  const playerCount = Object.keys(probabilities).length || 1;
  const entropy = calculateEntropy(probabilities);
  const maxEntropy = Math.log2(playerCount);
  const entropyCertainty = maxEntropy > 0 ? 1 - entropy / maxEntropy : 1;
  const separation = runnerUp ? clamp((top.probability - runnerUp.probability) / Math.max(top.probability, 0.0001), 0, 1) : 1;

  const topPlayer = players.find((p) => p.name === top.name);
  const topAlignment = topPlayer ? calculateSemanticAlignment(topPlayer, profile) / 2.55 : 0.5;
  const spread = calculateDnaSimilaritySpread(ranked.slice(0, 5), players, profile);
  const evidence = Math.min(1, Math.log10(questionCount + 1) / Math.log10(18));
  const contradictionDensity = estimateContradictionDensity(players, profile);

  const confidence = (
    entropyCertainty * 34 +
    separation * 26 +
    clamp(top.probability * 100, 0, 100) * 0.18 +
    topAlignment * 14 +
    spread * 8 -
    contradictionDensity * 8
  ) * (0.45 + evidence * 0.55);

  return {
    name: top.name,
    // V4 FIX: Reduced from 0.35 to 0.10 per informative question.
    // questionCount now only reflects informative answers, preventing "Don't Know" inflation.
    confidence: clamp(confidence + questionCount * 0.10, 0, 98.7),
    probability: top.probability,
    separation,
    entropy,
    semanticAlignment: topAlignment,
    dnaSpread: spread,
    contradictionDensity,
  };
}

export function validateFinalGuess(player, probabilities, players, history, questionCount) {
  if (!player) {
    return { valid: false, confidencePenalty: 0, reasons: ["missing-player"] };
  }

  const profile = buildSemanticProfile(history);
  const semantic = calculateSemanticConfidence(probabilities, players, history, questionCount);
  const contradictionPenalty = calculateContradictionPenalty(player, profile);
  const alignment = calculateSemanticAlignment(player, profile);
  const reasons = [];

  if (contradictionPenalty < 0.2) reasons.push("semantic-contradiction");
  if (alignment < 0.72 && profile.density >= 3) reasons.push("weak-dna-alignment");
  if (profile.confirmed.currentTeam && player.currentTeam !== profile.confirmed.currentTeam) reasons.push("franchise-mismatch");
  if (profile.confirmed.country && player.country !== profile.confirmed.country) reasons.push("country-mismatch");
  if ((semantic?.separation || 0) < 0.18 && questionCount < 14) reasons.push("low-top-candidate-separation");

  const valid = reasons.length === 0 || (reasons.length === 1 && reasons[0] === "weak-dna-alignment" && questionCount >= 16);
  return {
    valid,
    confidencePenalty: valid ? 1 : 0.55,
    reasons,
    semantic,
    alignment,
    contradictionPenalty,
  };
}

export function scoreQuestionSemanticUtility(option, candidates, history = []) {
  const profile = buildSemanticProfile(history);
  const traits = traitsFromQuestion({
    questionId: option.id,
    category: option.category,
    value: option.value,
    question: option.text,
  });
  const tags = traits.tags.length ? traits.tags : traits.semantic ? [traits.semantic] : [];
  const isObscurePool = candidates.some((p) => ["epic", "legendary", "legendary-obscure", "forgotten", "niche"].includes(p.obscurityProfile?.rarity || p.rarity));
  const isSemantic = option.category === "semantic-dna" || tags.length > 0;
  const isRedundant = tags.some((tag) => profile.positiveTags.has(tag) || profile.negativeTags.has(tag));

  let boost = 1;
  if (isSemantic) boost *= 1.28;
  if (option.category === "era") boost *= isObscurePool ? 1.35 : 1.08;
  if (option.category === "profile" && isObscurePool) boost *= 1.22;
  if (option.category === "franchise-history" && candidates.length <= 12) boost *= 1.25;
  if (isRedundant) boost *= 0.35;
  if (option.id === "obscure-short-career" && isObscurePool) boost *= 1.45;
  if (option.id === "ipl-specialist") boost *= 1.2;

  return boost;
}

export function getSemanticDifficulty(player, questionsAsked = 0) {
  if (!player) return 1;
  const rarity = player.obscurityProfile?.rarity || player.rarity || "rare";
  const rarityBoost = {
    common: 1,
    rare: 1.2,
    epic: 1.45,
    legendary: 1.7,
    "legendary-obscure": 1.9,
    forgotten: 1.85,
    niche: 1.55,
  }[rarity] || 1.25;
  const semanticComplexity = Math.min(0.6, (player.candidateRankingFeatures?.semanticDensity || player.dnaTags?.length || 0) / 35);
  const shortCareer = player.obscurityProfile?.nicheIdentifiers?.includes("very-short-ipl-career") ? 0.25 : 0;
  const longGame = Math.min(0.4, questionsAsked / 60);
  return Number((rarityBoost + semanticComplexity + shortCareer + longGame).toFixed(2));
}

function candidateMatchesTraits(player, traits, tags) {
  if (traits.country && player.country !== traits.country) return false;
  if (traits.currentTeam && player.currentTeam !== traits.currentTeam) return false;
  if (traits.team && !(player.teams || []).includes(traits.team)) return false;
  if (!tags.length) return true;

  const playerTags = getPlayerSemanticTags(player);
  return tags.some((tag) => playerTags.has(normalizeTag(tag)));
}

function semanticAnswerScore(match, answerKind) {
  if (answerKind === "maybe") return match ? MAYBE_YES_SCORE : MAYBE_NO_SCORE;
  const matchesAnswer = answerKind === "yes" ? match : !match;
  return matchesAnswer ? YES_SCORE : NO_SCORE;
}

function traitsFromQuestion(entry) {
  const questionId = entry.questionId || "";
  const category = entry.category || "";
  const value = entry.value || "";
  const tags = [...(ID_TO_TAGS[questionId] || [])].map(normalizeTag);

  if (questionId.startsWith("semantic:")) tags.push(normalizeTag(questionId.replace("semantic:", "")));
  if (category === "semantic-dna" && value) tags.push(normalizeTag(value));

  return {
    tags: unique(tags),
    semantic: category === "semantic-dna" ? normalizeTag(value || questionId.replace("semantic:", "")) : "",
    country: questionId.startsWith("country:") ? questionId.replace("country:", "") : category === "origin" ? value : "",
    currentTeam: questionId.startsWith("current-team:") ? questionId.replace("current-team:", "") : category === "current-team" ? value : "",
    team: questionId.startsWith("played-team:") ? questionId.replace("played-team:", "") : category === "franchise-history" ? value : "",
  };
}

function calculateDnaSimilaritySpread(ranked, players, profile) {
  if (!ranked.length) return 0;
  const scores = ranked.map(({ name }) => {
    const player = players.find((p) => p.name === name);
    return player ? calculateSemanticAlignment(player, profile) : 0;
  });
  const top = scores[0] || 0;
  const next = scores[1] || 0;
  return clamp((top - next) / Math.max(top, 0.001), 0, 1);
}

function estimateContradictionDensity(players, profile) {
  if (profile.density === 0 || !players.length) return 0;
  const contradicted = players.filter((player) => calculateContradictionPenalty(player, profile) < 0.2).length;
  return contradicted / players.length;
}

function getRarityMultiplier(player, profile) {
  const rarity = player.obscurityProfile?.rarity || player.rarity || "rare";
  const obscureIntent =
    profile.positiveTags.has("obscure") ||
    profile.positiveTags.has("short-career-player") ||
    profile.positiveTags.has("domestic-specialist") ||
    profile.positiveTags.has("one-season-wonder");

  if (!obscureIntent) return 1;
  if (["epic", "legendary", "legendary-obscure", "forgotten", "niche"].includes(rarity)) return 1.25;
  if (rarity === "common") return 0.82;
  return 1.05;
}

function getTagWeight(tag) {
  return TAG_WEIGHTS.get(tag) || TAG_WEIGHTS.get(normalizeTag(tag)) || 1;
}

function expandTag(value) {
  const raw = String(value || "");
  return [raw, raw.replace(/([a-z])([A-Z])/g, "$1-$2")];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeAnswer(answer) {
  const normalized = String(answer || "").toLowerCase().trim();
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  if (normalized === "maybe" || normalized === "probably") return "maybe";
  return "neutral";
}

function normalizeTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
