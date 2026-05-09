import { calculateEntropy, normalizeProbabilities } from "./probabilityEngine.js";

const MIN_SPLIT = 0.08;
const FRANCHISE_HISTORY_COOLDOWN = 3;

// Lazy-loaded cache for static questions (O(1) lookup by ID)
let staticQuestionCache = null;

// ═══════════════════════════════════════════════
// SEMANTIC CONCEPT GROUPS
// Prevents asking "Is he a batsman?" after user already said "Yes" to "Is he a batter?"
// Each group maps to a set of equivalent question IDs and inferred attributes.
// ═══════════════════════════════════════════════
const CONCEPT_GROUPS = {
  "role:batsman": {
    ids: ["batsman"],
    keywords: ["batter", "batsman", "batting"],
    infers_yes: { batsman: true },
    infers_no: { bowler: false, allrounder: false },
    suppresses: ["bowler", "allrounder", "wicketkeeper"],
  },
  "role:bowler": {
    ids: ["bowler"],
    keywords: ["bowler", "bowling"],
    infers_yes: { bowler: true },
    infers_no: { batsman: false, allrounder: false },
    suppresses: ["batsman", "allrounder"],
  },
  "role:allrounder": {
    ids: ["allrounder"],
    keywords: ["all-rounder", "allrounder", "all rounder"],
    infers_yes: { allrounder: true },
    infers_no: { batsman: false, bowler: false },
    suppresses: ["batsman", "bowler"],
  },
  "role:wicketkeeper": {
    ids: ["wicketkeeper"],
    keywords: ["wicket-keeper", "wicketkeeper", "keeper"],
    infers_yes: { wicketkeeper: true },
    infers_no: {},
    suppresses: [],
  },
  "origin:overseas": {
    ids: ["overseas"],
    keywords: ["overseas", "foreign"],
    infers_yes: { overseas: true, indian: false },
    infers_no: { indian: true },
    suppresses: ["indian"],
  },
  "origin:indian": {
    ids: ["indian"],
    keywords: ["indian", "from india"],
    infers_yes: { indian: true, overseas: false },
    infers_no: { overseas: true },
    suppresses: ["overseas"],
  },
  "bowling:spinner": {
    ids: ["spinner"],
    keywords: ["spinner", "spin"],
    infers_yes: { spinner: true, pacer: false },
    infers_no: {},
    suppresses: ["pacer"],
  },
  "bowling:pacer": {
    ids: ["pacer"],
    keywords: ["pace", "fast", "pacer", "quick"],
    infers_yes: { pacer: true, spinner: false },
    infers_no: {},
    suppresses: ["spinner"],
  },
  "batting:opener": {
    ids: ["opener"],
    keywords: ["opener", "opening"],
    infers_yes: { opener: true },
    infers_no: {},
    suppresses: ["middle-order", "finisher"],
  },
  "batting:middle-order": {
    ids: ["middle-order"],
    keywords: ["middle order", "middle-order"],
    infers_yes: { "middle-order": true },
    infers_no: {},
    suppresses: ["opener"],
  },
  "batting:left-handed": {
    ids: ["left-handed"],
    keywords: ["left-handed", "lefty", "left hand"],
    infers_yes: { "left-handed": true },
    infers_no: {},
    suppresses: [],
  },
};

// ═══════════════════════════════════════════════
// QUESTION STAGE SYSTEM
// Forces intelligent ordering: broad → narrow
// ═══════════════════════════════════════════════
const QUESTION_STAGES = [
  { name: "role", minQuestion: 0, categories: ["role"] },
  { name: "scope", minQuestion: 1, categories: ["origin", "era", "profile"] },
  { name: "tactics", minQuestion: 2, categories: ["batting-role", "batting-style", "bowling-style", "bowling-role", "leadership", "achievement"] },
  { name: "team", minQuestion: 4, categories: ["current-team"] },
  { name: "narrowing", minQuestion: 6, categories: ["franchise-history", "achievement"] },
];

const staticQuestions = [
  // Stage 1: Broad classification (role)
  question("batsman", "role", "Is this player primarily a batter?", (p) => p.role === "batsman"),
  question("bowler", "role", "Is this player primarily a bowler?", (p) => p.role === "bowler"),
  question("allrounder", "role", "Is this player an all-rounder?", (p) => p.role === "all-rounder"),
  question("wicketkeeper", "role", "Is this player a wicketkeeper?", (p) => p.wicketKeeper || p.role === "wicket-keeper"),

  // Stage 2: Player scope (origin / era)
  question("overseas", "origin", "Is this player an overseas (non-Indian) player?", (p) => p.overseas),
  question("indian", "origin", "Is this player from India?", (p) => p.country === "India"),
  question("iconic", "profile", "Is this player considered a well-known / iconic IPL name?", (p) => p.iconic),
  question("active", "era", "Is this player currently active in recent IPL seasons?", (p) => p.active),

  // Stage 3: Tactical attributes
  question("opener", "batting-role", "Does this player usually open the batting?", (p) => p.opener),
  question("middle-order", "batting-role", "Does this player bat in the middle order?", (p) => p.middleOrder),
  question("finisher", "batting-role", "Is this player known as a finisher?", (p) => p.finisher),
  question("power-hitter", "batting-style", "Is this player known for aggressive power hitting?", (p) => p.powerHitter || p.aggressive),
  question("anchor", "batting-style", "Is this player more of a steady anchor batter?", (p) => p.anchorBatter),
  question("left-handed", "batting-style", "Is this player a left-handed batter?", (p) => p.leftHanded),
  question("spinner", "bowling-style", "Is this player a spin bowler?", (p) => p.spinner),
  question("pacer", "bowling-style", "Is this player a pace bowler?", (p) => p.pacer),
  question("death-bowler", "bowling-role", "Is this player known for bowling at the death?", (p) => p.deathBowler || p.famousForYorkers),
  question("captain", "leadership", "Has this player captained an IPL team?", (p) => p.captain),
  question("orange-cap", "achievement", "Has this player won an IPL Orange Cap?", (p) => p.orangeCap),
  question("purple-cap", "achievement", "Has this player won an IPL Purple Cap?", (p) => p.purpleCap),
  question("playoffs-hero", "achievement", "Is this player known for clutch playoff performances?", (p) => p.playoffsHero),
  question("fan-favorite", "profile", "Is this player a fan favorite?", (p) => p.fanFavorite),
];

export function selectBestQuestion(candidates, probabilities, history = []) {
  // Build questions dynamically based on actual candidate pool
  const options = buildQuestionOptions(candidates);
  const scopedProbabilities = normalizeProbabilities(
    Object.fromEntries(candidates.map((player) => [player.name, probabilities[player.name] || 0]))
  );
  const askedIds = new Set(history.map((entry) => entry.questionId).filter(Boolean));
  const askedTexts = new Set(history.map((entry) => normalize(entry.question)));
  const categoryCounts = countCategories(history);
  const baseEntropy = calculateEntropy(scopedProbabilities);

  // Build suppressed concept set from semantic analysis
  const suppressedIds = buildSuppressedConceptSet(history);

  // Determine allowed categories based on question stage
  const questionNumber = history.length;
  const allowedCategories = getAllowedCategories(questionNumber);

  // Score questions using information gain + balance + diversity
  const scored = options
    .filter((option) => !askedIds.has(option.id) && !askedTexts.has(normalize(option.text)))
    .filter((option) => !suppressedIds.has(option.id))
    .filter((option) => !isHardSuppressed(option, history, candidates.length))
    .filter((option) => allowedCategories.has(option.category))
    .map((option) => scoreQuestion(option, candidates, scopedProbabilities, baseEntropy, categoryCounts))
    .filter((option) => option.yesProbability >= MIN_SPLIT && option.noProbability >= MIN_SPLIT)
    .map((option) => ({
      ...option,
      adaptiveBoost: calculateAdaptiveBoost(option, categoryCounts, history),
    }))
    .sort((a, b) => (b.score * b.adaptiveBoost) - (a.score * a.adaptiveBoost));

  return scored[0] || fallbackQuestion(candidates, history);
}

/**
 * Build the set of question IDs that should be semantically suppressed.
 * If user said "Yes" to "batsman", suppress "bowler" and "allrounder" since they're contradictory.
 */
function buildSuppressedConceptSet(history) {
  const suppressed = new Set();

  for (const entry of history) {
    const questionId = entry.questionId;
    const answer = normalizeAnswer(entry.answer);
    if (!questionId || answer === "neutral") continue;

    // Find which concept group this answered question belongs to
    for (const group of Object.values(CONCEPT_GROUPS)) {
      if (group.ids.includes(questionId)) {
        if (answer === "yes") {
          // Suppress contradictory questions
          group.suppresses.forEach((id) => suppressed.add(id));
        }
        break;
      }
    }
  }

  return suppressed;
}

/**
 * Get allowed question categories based on question number.
 * Early questions focus on broad classification, later on fine-grained narrowing.
 * All previously unlocked stages remain available.
 */
function getAllowedCategories(questionNumber) {
  const allowed = new Set();
  for (const stage of QUESTION_STAGES) {
    if (questionNumber >= stage.minQuestion) {
      stage.categories.forEach((cat) => allowed.add(cat));
    }
  }
  // Always allow dynamic categories
  allowed.add("current-team");
  allowed.add("franchise-history");
  return allowed;
}

/**
 * Calculate adaptive boost for question based on category diversity.
 * Encourages diverse question categories to avoid repetition.
 */
function calculateAdaptiveBoost(option, categoryCounts, history) {
  let boost = 1.0;

  // Boost if category hasn't been asked much
  const categoryAskedCount = categoryCounts[option.category] || 0;
  if (categoryAskedCount === 0) boost *= 1.25;
  else if (categoryAskedCount === 1) boost *= 1.05;
  else if (categoryAskedCount >= 3) boost *= 0.6;

  // Boost team-related if not recently asked
  const isTeam = isTeamCategory(option.category);
  const teamAskedCount = categoryCounts.currentTeamAndHistorical || 0;
  if (isTeam && teamAskedCount === 0) boost *= 1.1;
  else if (isTeam && teamAskedCount >= 2) boost *= 0.5;

  // Penalize same category in last 3 questions more aggressively
  const recentCategories = history.slice(-3).map((h) => h.category);
  const categoryInRecent = recentCategories.filter((c) => c === option.category).length;
  if (categoryInRecent === 0) boost *= 1.1;
  else if (categoryInRecent >= 2) boost *= 0.4;

  return boost;
}

/**
 * Evaluate a question answer with GRADIENT scoring.
 * V2: Uses softer scores instead of binary 0.97/0.001.
 * Matching players get 0.85, non-matching get 0.15.
 * This prevents a single wrong predicate from killing the correct player.
 */
export function evaluateQuestionAnswer(candidates, questionMeta, answer) {
  const answerKind = normalizeAnswer(answer);

  // "Maybe" and "Don't Know" should barely move probabilities
  if (answerKind === "neutral") {
    return neutralScores(candidates, 0.5);
  }

  if (!questionMeta) {
    console.warn("[questionEngine] Missing questionMeta in evaluateQuestionAnswer - cannot evaluate answer");
    return neutralScores(candidates, 0.5);
  }

  const option = hydrateQuestion(questionMeta);
  if (!option) {
    console.warn(`[questionEngine] Failed to hydrate question with ID: ${questionMeta.id}`);
    return null;
  }

  const scores = {};
  candidates.forEach((player) => {
    const yes = option.predicate(player);
    const matches = answerKind === "yes" ? yes : !yes;
    // V2: Gradient scoring — matching players get boost, non-matching get penalty
    // But not binary death. Allows recovery from data inaccuracies.
    scores[player.name] = matches ? 0.85 : 0.15;
  });

  return scores;
}

export function buildQuestionOptions(candidates) {
  const options = [...staticQuestions];
  const teams = unique(candidates.flatMap((player) => player.teams || []));
  const currentTeams = unique(candidates.map((player) => player.currentTeam).filter(Boolean));
  const countries = unique(candidates.map((player) => player.country).filter(Boolean));

  currentTeams.forEach((team) => {
    options.push(
      question(
        `current-team:${team}`,
        "current-team",
        `Is this player currently with ${team}?`,
        (player) => player.currentTeam === team,
        { value: team }
      )
    );
  });

  teams.forEach((team) => {
    options.push(
      question(
        `played-team:${team}`,
        "franchise-history",
        `Has this player played for ${team}?`,
        (player) => player.teams.includes(team),
        { value: team }
      )
    );
  });

  countries
    .filter((country) => country !== "India")
    .forEach((country) => {
      options.push(
        question(
          `country:${country}`,
          "origin",
          `Is this player from ${country}?`,
          (player) => player.country === country,
          { value: country }
        )
      );
    });

  return options;
}

function scoreQuestion(option, candidates, probabilities, baseEntropy, categoryCounts) {
  let yesProbability = 0;
  const yesDistribution = {};
  const noDistribution = {};

  candidates.forEach((player) => {
    const probability = probabilities[player.name] || 0;
    if (option.predicate(player)) {
      yesProbability += probability;
      yesDistribution[player.name] = probability;
    } else {
      noDistribution[player.name] = probability;
    }
  });

  const noProbability = 1 - yesProbability;
  const yesEntropy = calculateEntropy(normalizeProbabilities(yesDistribution));
  const noEntropy = calculateEntropy(normalizeProbabilities(noDistribution));
  const expectedEntropy = yesProbability * yesEntropy + noProbability * noEntropy;
  const informationGain = baseEntropy - expectedEntropy;
  const balance = 1 - Math.abs(0.5 - yesProbability) * 2;
  const categoryPenalty = Math.pow(0.75, categoryCounts[option.category] || 0);
  const teamPenalty = isTeamCategory(option.category)
    ? Math.pow(0.1, (categoryCounts.currentTeamAndHistorical || 0) + 1)
    : 1;
  const historicTeamPenalty = option.category === "franchise-history" ? 0.06 : 1;
  const lowInfoPenalty = yesProbability < 0.15 || noProbability < 0.15 ? 0.08 : 1;

  return {
    ...option,
    yesProbability,
    noProbability,
    informationGain,
    score: informationGain * (0.7 + balance * 0.3) * categoryPenalty * teamPenalty * historicTeamPenalty * lowInfoPenalty,
  };
}

function fallbackQuestion(candidates, history) {
  const askedIds = new Set(history.map((e) => e.questionId));
  const fallback = staticQuestions.find(
    (option) => !askedIds.has(option.id)
  );
  return fallback || staticQuestions[0];
}

function hydrateQuestion(meta) {
  // Use cached lookup for O(1) retrieval instead of rebuilding all questions
  if (!staticQuestionCache) {
    staticQuestionCache = new Map(staticQuestions.map(q => [q.id, q]));
  }

  const staticQuestion = staticQuestionCache.get(meta.id);
  return staticQuestion || hydrateDynamicQuestion(meta);
}

function hydrateDynamicQuestion(meta) {
  if (meta.category === "current-team") {
    return question(meta.id, meta.category, meta.text, (player) => player.currentTeam === meta.value, {
      value: meta.value,
    });
  }

  if (meta.category === "historical-team" || meta.category === "franchise-history") {
    return question(meta.id, meta.category, meta.text, (player) => player.teams.includes(meta.value), {
      value: meta.value,
    });
  }

  if (meta.category === "origin") {
    return question(meta.id, meta.category, meta.text, (player) => player.country === meta.value, {
      value: meta.value,
    });
  }

  return null;
}

function question(id, category, text, predicate, extra = {}) {
  return { id, category, text, predicate, ...extra };
}

function countCategories(history) {
  const counts = {};
  history.forEach((entry) => {
    if (!entry.category) return;
    counts[entry.category] = (counts[entry.category] || 0) + 1;
    if (isTeamCategory(entry.category)) {
      counts.currentTeamAndHistorical = (counts.currentTeamAndHistorical || 0) + 1;
    }
  });
  return counts;
}

function isHardSuppressed(option, history, candidateCount) {
  if (option.category === "franchise-history" && candidateCount > 5) return true;

  const recentCategories = history.slice(-FRANCHISE_HISTORY_COOLDOWN).map((entry) => entry.category);
  if (option.category === "franchise-history" && recentCategories.includes("franchise-history")) {
    return true;
  }

  if (isTeamCategory(option.category) && recentCategories.some(isTeamCategory)) {
    return true;
  }

  return false;
}

function isTeamCategory(category = "") {
  return category === "current-team" || category === "historical-team" || category === "franchise-history";
}

function neutralScores(candidates, score) {
  return Object.fromEntries(candidates.map((player) => [player.name, score]));
}

function normalizeAnswer(answer) {
  const normalized = normalize(answer);
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return "neutral";
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort();
}
