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
  ["rajasthan royals", "Rajasthan Royals"],
  ["rr", "Rajasthan Royals"],
  ["rising pune supergiant", "Rising Pune Supergiant"],
  ["royal challengers bangalore", "Royal Challengers Bengaluru"],
  ["royal challengers bengaluru", "Royal Challengers Bengaluru"],
  ["rcb", "Royal Challengers Bengaluru"],
  ["sunrisers hyderabad", "Sunrisers Hyderabad"],
  ["srh", "Sunrisers Hyderabad"],
]);

const traitQuestions = [
  { patterns: ["opener", "open the batting", "top two"], trait: "opener" },
  { patterns: ["middle order", "middle-order"], trait: "middleOrder" },
  { patterns: ["finisher", "death overs batter"], trait: "finisher" },
  { patterns: ["power hitter", "big hitter", "six hitter"], trait: "powerHitter" },
  { patterns: ["anchor"], trait: "anchorBatter" },
  { patterns: ["death bowler", "death overs bowler"], trait: "deathBowler" },
  { patterns: ["orange cap"], trait: "orangeCap" },
  { patterns: ["purple cap"], trait: "purpleCap" },
  { patterns: ["playoff", "play-offs", "knockout"], trait: "playoffsHero" },
  { patterns: ["iconic", "legend"], trait: "iconic" },
  { patterns: ["active", "currently playing", "current player"], trait: "active" },
  { patterns: ["retired"], trait: "retired" },
  { patterns: ["overseas", "foreign"], trait: "overseas" },
  { patterns: ["wicket keeper", "wicket-keeper", "keeper"], trait: "wicketKeeper" },
  { patterns: ["captain"], trait: "captain" },
];

const roleQuestions = [
  { patterns: ["batsman", "batter"], role: "batsman" },
  { patterns: ["bowler"], role: "bowler" },
  { patterns: ["all rounder", "all-rounder"], role: "all-rounder" },
  { patterns: ["wicket keeper", "wicket-keeper"], role: "wicket-keeper" },
];

export function evaluateDeterministicAnswer(candidates, question, answer) {
  const answerKind = normalizeAnswer(answer);
  if (answerKind === "neutral") return null;

  const normalizedQuestion = normalize(question);
  const team = findMentionedTeam(normalizedQuestion);

  if (team) {
    return scoreCandidates(candidates, answerKind, (player) => player.teams.includes(team));
  }

  const trait = traitQuestions.find(({ patterns }) =>
    patterns.some((pattern) => normalizedQuestion.includes(pattern))
  )?.trait;

  if (trait) {
    return scoreCandidates(candidates, answerKind, (player) => Boolean(player[trait]));
  }

  const role = roleQuestions.find(({ patterns }) =>
    patterns.some((pattern) => normalizedQuestion.includes(pattern))
  )?.role;

  if (role) {
    return scoreCandidates(candidates, answerKind, (player) => player.role === role);
  }

  return null;
}

function scoreCandidates(candidates, answerKind, predicate) {
  const scores = {};

  candidates.forEach((player) => {
    const hasTrait = predicate(player);
    const matchesAnswer = answerKind === "yes" ? hasTrait : !hasTrait;
    scores[player.name] = matchesAnswer ? 1 : 0;
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
