/**
 * Answer Evaluator — Deterministic scoring engine.
 * Converts question text + user answer into match scores for every candidate.
 *
 * V3 OVERHAUL:
 * - Comprehensive pattern coverage (age, country, role, style, experience, traits)
 * - Aggressive scoring: 0.95 match / 0.05 mismatch (19x ratio)
 * - Structured attribute extraction from question text
 * - This is the PRIMARY scoring path — Gemini is only a fallback
 */

const teamAliases = new Map([
  ["chennai super kings", "Chennai Super Kings"],
  ["csk", "Chennai Super Kings"],
  ["deccan chargers", "Deccan Chargers"],
  ["dc", "Delhi Capitals"],
  ["delhi capitals", "Delhi Capitals"],
  ["delhi daredevils", "Delhi Capitals"],
  ["gujarat lions", "Gujarat Lions"],
  ["gujarat titans", "Gujarat Titans"],
  ["gt", "Gujarat Titans"],
  ["kochi tuskers", "Kochi Tuskers Kerala"],
  ["kolkata knight riders", "Kolkata Knight Riders"],
  ["kkr", "Kolkata Knight Riders"],
  ["lucknow super giants", "Lucknow Super Giants"],
  ["lsg", "Lucknow Super Giants"],
  ["mumbai indians", "Mumbai Indians"],
  ["mi", "Mumbai Indians"],
  ["pune warriors", "Pune Warriors India"],
  ["punjab kings", "Punjab Kings"],
  ["kings xi punjab", "Punjab Kings"],
  ["kxip", "Punjab Kings"],
  ["pbks", "Punjab Kings"],
  ["rajasthan royals", "Rajasthan Royals"],
  ["rr", "Rajasthan Royals"],
  ["rising pune supergiant", "Rising Pune Supergiant"],
  ["royal challengers bangalore", "Royal Challengers Bengaluru"],
  ["royal challengers bengaluru", "Royal Challengers Bengaluru"],
  ["rcb", "Royal Challengers Bengaluru"],
  ["sunrisers hyderabad", "Sunrisers Hyderabad"],
  ["srh", "Sunrisers Hyderabad"],
]);

// Country patterns for nationality questions
const countryPatterns = [
  { patterns: ["india", "indian"], country: "India" },
  { patterns: ["australia", "australian"], country: "Australia" },
  { patterns: ["england", "english", "british"], country: "England" },
  { patterns: ["south africa", "south african"], country: "South Africa" },
  { patterns: ["new zealand", "new zealander", "kiwi"], country: "New Zealand" },
  { patterns: ["west indies", "west indian", "caribbean"], country: "West Indies" },
  { patterns: ["sri lanka", "sri lankan"], country: "Sri Lanka" },
  { patterns: ["afghanistan", "afghan"], country: "Afghanistan" },
  { patterns: ["bangladesh", "bangladeshi"], country: "Bangladesh" },
];

// Boolean trait questions — maps text patterns to player properties
const traitQuestions = [
  { patterns: ["opener", "open the batting", "opens the batting", "top of the order", "opening bat", "open the innings"], trait: "opener" },
  { patterns: ["middle order", "middle-order", "number 4", "number 5", "no 4", "no 5"], trait: "middleOrder" },
  { patterns: ["finisher", "death overs bat", "finish innings", "finishing role"], trait: "finisher" },
  { patterns: ["power hitter", "big hitter", "six hitter", "sixes", "big hitting", "hits big"], trait: "powerHitter" },
  { patterns: ["anchor", "anchor batter", "anchor bat"], trait: "anchorBatter" },
  { patterns: ["death bowler", "death overs bowler", "bowls at death"], trait: "deathBowler" },
  { patterns: ["orange cap", "most runs in a season"], trait: "orangeCap" },
  { patterns: ["purple cap", "most wickets in a season"], trait: "purpleCap" },
  { patterns: ["playoff", "play-offs", "play offs", "knockout"], trait: "playoffsHero" },
  { patterns: ["iconic", "legend", "legendary"], trait: "iconic" },
  { patterns: ["active", "currently playing", "current player", "still playing", "plays currently"], trait: "active" },
  { patterns: ["retired", "no longer playing", "stopped playing"], trait: "retired" },
  { patterns: ["overseas", "foreign", "international player", "non indian"], trait: "overseas" },
  { patterns: ["wicket keeper", "wicket-keeper", "keeper", "behind the stumps", "keeping", "stumper"], trait: "wicketKeeper" },
  { patterns: ["captain", "leads the team", "skipper", "captains"], trait: "captain" },
  { patterns: ["left handed", "left-handed", "left hand bat", "lefty", "leftie"], trait: "leftHanded" },
  { patterns: ["fan favorite", "fan favourite", "popular", "crowd favorite"], trait: "fanFavorite" },
  { patterns: ["mystery spinner", "mystery spin"], trait: "mysterySpinner" },
  { patterns: ["yorker", "yorkers", "famous for yorkers"], trait: "famousForYorkers" },
  { patterns: ["title winning captain", "won ipl as captain", "ipl winning captain"], trait: "titleWinningCaptain" },
  { patterns: ["aggressive", "aggressive bat", "aggressive player", "attacking"], trait: "aggressive" },
  { patterns: ["cult ipl hero", "cult hero", "cult player"], check: (p) => Boolean(p.questionAttributes?.cultPlayer || p.dnaTags?.includes("cult-player")) },
  { patterns: ["ipl specialist", "more famous for ipl", "remembered more for ipl"], check: (p) => Boolean(p.questionAttributes?.IPLSpecialist) },
  { patterns: ["one franchise", "one-franchise", "strongly associated with one franchise", "loyal to one"], check: (p) => p.franchiseLoyalty === "one-franchise" || (p.teams?.length === 1) },
  { patterns: ["journeyman", "several franchises", "many franchises", "multiple franchises"], check: (p) => p.franchiseLoyalty === "journeyman" || (p.teams?.length || 0) >= 4 },
  { patterns: ["obscure", "lesser known", "forgotten", "short career", "one season"], check: (p) => ["epic", "legendary", "legendary-obscure", "forgotten", "niche"].includes(p.obscurityProfile?.rarity || p.rarity) },
];

// Role patterns
const roleQuestions = [
  { patterns: ["batsman", "batter", "pure batsman", "specialist batter", "specialist batsman"], role: "batsman" },
  { patterns: ["bowler", "specialist bowler", "pure bowler"], role: "bowler" },
  { patterns: ["all rounder", "all-rounder", "allrounder"], role: "all-rounder" },
];

// Bowling style patterns
const bowlingStylePatterns = [
  { patterns: ["spin", "spinner", "spins the ball", "spin bowler", "spin bowling"], check: (p) => Boolean(p.spinner) },
  { patterns: ["pace", "pacer", "fast bowler", "fast bowling", "quick bowler", "seam"], check: (p) => Boolean(p.pacer) },
  { patterns: ["leg spin", "leg-spin", "leggie", "leg spinner", "leg break"], check: (p) => /leg/i.test(p.bowlingStyle || "") },
  { patterns: ["off spin", "off-spin", "off spinner", "off break"], check: (p) => /off/i.test(p.bowlingStyle || "") },
  { patterns: ["left arm", "left-arm", "left arm bowler"], check: (p) => /left/i.test(p.bowlingStyle || "") },
];

// Age-related patterns with threshold extraction
const agePatterns = [
  { regex: /(?:over|above|older than|more than)\s*(\d+)\s*(?:years|yrs)?/i, operator: ">" },
  { regex: /(?:under|below|younger than|less than)\s*(\d+)\s*(?:years|yrs)?/i, operator: "<" },
  { regex: /(\d+)\s*(?:years|yrs)\s*(?:old|of age)/i, operator: "=" },
];

// IPL runs/wickets patterns
const statsPatterns = [
  { regex: /(?:scored|more than|over)\s*(\d+)\s*(?:ipl)?\s*runs/i, stat: "runs", operator: ">" },
  { regex: /(?:taken|more than|over)\s*(\d+)\s*(?:ipl)?\s*wickets/i, stat: "wickets", operator: ">" },
  { regex: /(?:won|more than|over)\s*(\d+)\s*(?:ipl)?\s*titles/i, stat: "titlesWon", operator: ">" },
];

// Debut year patterns
const debutPatterns = [
  { regex: /debut(?:ed)?\s*(?:before|prior to)\s*(\d{4})/i, operator: "<" },
  { regex: /debut(?:ed)?\s*(?:after|since)\s*(\d{4})/i, operator: ">" },
  { regex: /debut(?:ed)?\s*(?:in)\s*(\d{4})/i, operator: "=" },
  { regex: /playing\s*(?:since|from)\s*(\d{4})/i, operator: "<=" },
  { regex: /(?:more than|over)\s*(\d+)\s*(?:years?|seasons?)\s*(?:of)?\s*(?:experience|ipl)/i, stat: "experience" },
];

/**
 * Evaluate answer deterministically against all candidates.
 * V3: Comprehensive pattern matching with aggressive scoring.
 */
export function evaluateDeterministicAnswer(candidates, question, answer) {
  const answerKind = normalizeAnswer(answer);
  if (answerKind === "neutral") return null;

  const normalizedQuestion = normalize(question);

  // Try each evaluation strategy in order of specificity
  return (
    evaluateTeamQuestion(candidates, normalizedQuestion, answerKind) ||
    evaluateCountryQuestion(candidates, normalizedQuestion, answerKind) ||
    evaluateAgeQuestion(candidates, question, answerKind) ||
    evaluateRoleQuestion(candidates, normalizedQuestion, answerKind) ||
    evaluateBowlingStyleQuestion(candidates, normalizedQuestion, answerKind) ||
    evaluateTraitQuestion(candidates, normalizedQuestion, answerKind) ||
    evaluateDebutQuestion(candidates, question, answerKind) ||
    evaluateStatsQuestion(candidates, question, answerKind) ||
    null // Return null → triggers Gemini fallback
  );
}

/** Score candidates for team-related questions */
function evaluateTeamQuestion(candidates, question, answerKind) {
  const team = findMentionedTeam(question);
  if (!team) return null;

  // Check if asking about current team specifically
  const isCurrent = question.includes("current") || question.includes("plays for") || question.includes("playing for");

  return scoreCandidates(candidates, answerKind, (player) => {
    if (isCurrent) return player.currentTeam === team;
    return (player.teams || []).includes(team);
  });
}

/** Score candidates for country/nationality questions */
function evaluateCountryQuestion(candidates, question, answerKind) {
  const match = countryPatterns.find(({ patterns }) =>
    patterns.some((p) => question.includes(p))
  );
  if (!match) return null;

  return scoreCandidates(candidates, answerKind, (player) =>
    player.country === match.country
  );
}

/** Score candidates for age-related questions */
function evaluateAgeQuestion(candidates, rawQuestion, answerKind) {
  for (const { regex, operator } of agePatterns) {
    const match = rawQuestion.match(regex);
    if (match) {
      const threshold = parseInt(match[1], 10);
      const currentYear = new Date().getFullYear();

      return scoreCandidates(candidates, answerKind, (player) => {
        // Estimate age from debut year (assume debut at ~20)
        const estimatedAge = player.debutYear
          ? currentYear - player.debutYear + 20
          : 30; // Default fallback

        if (operator === ">") return estimatedAge > threshold;
        if (operator === "<") return estimatedAge < threshold;
        return Math.abs(estimatedAge - threshold) <= 2; // Rough match for "="
      });
    }
  }
  return null;
}

/** Score candidates for role-related questions */
function evaluateRoleQuestion(candidates, question, answerKind) {
  const match = roleQuestions.find(({ patterns }) =>
    patterns.some((p) => question.includes(p))
  );
  if (!match) return null;

  return scoreCandidates(candidates, answerKind, (player) =>
    (player.role || "").toLowerCase().includes(match.role)
  );
}

/** Score candidates for bowling style questions */
function evaluateBowlingStyleQuestion(candidates, question, answerKind) {
  const match = bowlingStylePatterns.find(({ patterns }) =>
    patterns.some((p) => question.includes(p))
  );
  if (!match) return null;

  return scoreCandidates(candidates, answerKind, match.check);
}

/** Score candidates for boolean trait questions */
function evaluateTraitQuestion(candidates, question, answerKind) {
  const match = traitQuestions.find(({ patterns }) =>
    patterns.some((p) => question.includes(p))
  );
  if (!match) return null;

  return scoreCandidates(candidates, answerKind, (player) =>
    match.check ? match.check(player) : Boolean(player[match.trait])
  );
}

/** Score candidates for debut-year questions */
function evaluateDebutQuestion(candidates, rawQuestion, answerKind) {
  for (const { regex, operator, stat } of debutPatterns) {
    const match = rawQuestion.match(regex);
    if (match) {
      const value = parseInt(match[1], 10);

      if (stat === "experience") {
        // "More than X years of experience"
        const currentYear = new Date().getFullYear();
        return scoreCandidates(candidates, answerKind, (player) => {
          if (!player.debutYear) return false;
          return (currentYear - player.debutYear) > value;
        });
      }

      return scoreCandidates(candidates, answerKind, (player) => {
        if (!player.debutYear) return false;
        if (operator === "<") return player.debutYear < value;
        if (operator === ">") return player.debutYear > value;
        if (operator === "<=") return player.debutYear <= value;
        return player.debutYear === value;
      });
    }
  }
  return null;
}

/** Score candidates for stats questions (runs, wickets, titles) */
function evaluateStatsQuestion(candidates, rawQuestion, answerKind) {
  for (const { regex, stat, operator } of statsPatterns) {
    const match = rawQuestion.match(regex);
    if (match) {
      const threshold = parseInt(match[1], 10);

      return scoreCandidates(candidates, answerKind, (player) => {
        const value = player[stat] || 0;
        if (operator === ">") return value > threshold;
        return value === threshold;
      });
    }
  }
  return null;
}

/**
 * V3: Aggressive scoring — 0.95 match / 0.05 mismatch.
 * Creates a 19x ratio between matching and non-matching candidates.
 * This ensures contradictory candidates are rapidly eliminated.
 */
function scoreCandidates(candidates, answerKind, predicate) {
  const scores = {};

  candidates.forEach((player) => {
    const hasTrait = predicate(player);
    const matchesAnswer = answerKind === "yes" ? hasTrait : !hasTrait;
    // V3: Aggressive elimination — contradictions decay rapidly
    scores[player.name] = matchesAnswer ? 0.95 : 0.05;
  });

  return scores;
}

function findMentionedTeam(question) {
  for (const [alias, team] of teamAliases.entries()) {
    const matcher = new RegExp(`(^|\\s)${escapeRegex(alias)}($|\\s)`);
    if (matcher.test(question)) return team;
  }
  return null;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

