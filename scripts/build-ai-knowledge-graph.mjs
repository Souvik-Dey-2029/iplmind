/**
 * IPLMind AI-grade player knowledge graph builder.
 *
 * This is intentionally deterministic by default. It enriches the existing
 * player list with semantic IPL intelligence, optional 2026 squad data,
 * optional metric snapshots, optional external master data, and optional
 * AI-generated enrichment that must pass schema validation before merging.
 *
 * Usage:
 *   node scripts/build-ai-knowledge-graph.mjs --dry-run
 *   node scripts/build-ai-knowledge-graph.mjs --write
 *   node scripts/build-ai-knowledge-graph.mjs --write --ai
 *
 * Optional source files:
 *   data/ipl-player-master.json       canonical all-era player seed list
 *   data/ai-player-enrichment.json    validated Gemini/OpenRouter output cache
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const writeMode = args.has("--write");
const dryRun = args.has("--dry-run") || !writeMode;
const useAi = args.has("--ai");
const aiLimitArg = rawArgs.find((arg) => arg.startsWith("--ai-limit="))?.split("=")[1];
const aiLimit = aiLimitArg === "all" ? Infinity : Number(aiLimitArg || 20);

const paths = {
  players: path.join(rootDir, "src", "data", "players.json"),
  metadata: path.join(rootDir, "src", "data", "playerMetadata.json"),
  metrics: path.join(rootDir, "src", "data", "player-metrics.json"),
  squads2026: path.join(rootDir, "scripts", "ipl2026squads.json"),
  masterSeed: path.join(rootDir, "data", "ipl-player-master.json"),
  aiCache: path.join(rootDir, "data", "ai-player-enrichment.json"),
  outPlayers: path.join(rootDir, "src", "data", "players.json"),
  outIndex: path.join(rootDir, "src", "data", "playerKnowledgeIndex.json"),
  outSchema: path.join(rootDir, "src", "data", "playerKnowledgeSchema.json"),
  outReport: path.join(rootDir, "src", "data", "dataset-report.json"),
  outGaps: path.join(rootDir, "src", "data", "auto-learning-gaps.json"),
};

const TEAM_CODES = {
  CSK: "Chennai Super Kings",
  DC: "Delhi Capitals",
  DD: "Delhi Capitals",
  GT: "Gujarat Titans",
  KKR: "Kolkata Knight Riders",
  LSG: "Lucknow Super Giants",
  MI: "Mumbai Indians",
  PBKS: "Punjab Kings",
  PK: "Punjab Kings",
  KXIP: "Punjab Kings",
  RCB: "Royal Challengers Bengaluru",
  RR: "Rajasthan Royals",
  SRH: "Sunrisers Hyderabad",
};

const COUNTRY_CODES = {
  IND: "India",
  AUS: "Australia",
  ENG: "England",
  NZ: "New Zealand",
  SA: "South Africa",
  RSA: "South Africa",
  WI: "West Indies",
  SL: "Sri Lanka",
  AFG: "Afghanistan",
  BAN: "Bangladesh",
  ZIM: "Zimbabwe",
  IRE: "Ireland",
  NEP: "Nepal",
  SCO: "Scotland",
  UAE: "United Arab Emirates",
  USA: "United States",
  NED: "Netherlands",
};

const ROLE_VALUES = new Set(["batsman", "bowler", "all-rounder", "wicket-keeper", "unknown"]);
const BAT_POSITIONS = new Set(["opener", "top-middle", "middle-lower", "tail", "middle"]);
const LEGACY_BOOLEAN_FIELDS = [
  "active",
  "retired",
  "overseas",
  "wicketKeeper",
  "opener",
  "middleOrder",
  "finisher",
  "powerHitter",
  "anchorBatter",
  "spinner",
  "pacer",
  "deathBowler",
  "captain",
  "titleWinningCaptain",
  "orangeCap",
  "purpleCap",
  "leftHanded",
  "aggressive",
  "defensive",
  "mysterySpinner",
  "famousForYorkers",
  "playoffsHero",
  "fanFavorite",
  "iconic",
];

const KNOWN_DNA = {
  "MS Dhoni": {
    nickname: "Mahi",
    tags: ["captain-cool", "csk-icon", "helicopter-shot", "tactical-genius", "calm-under-pressure"],
    moments: ["2010-final-finisher", "2018-csk-comeback-title", "2023-csk-title"],
    leadership: "iconic-captain",
  },
  "Virat Kohli": {
    nickname: "King Kohli",
    tags: ["run-machine", "rcb-icon", "chase-master", "intensity-leader", "loyal-franchise-icon"],
    moments: ["2016-973-run-season", "multiple-orange-cap-seasons"],
    leadership: "former-captain",
  },
  "Chris Gayle": {
    nickname: "Universe Boss",
    tags: ["universe-boss", "six-hitter", "explosive-opener", "powerplay-destroyer", "entertainer"],
    moments: ["175-not-out-vs-pune-warriors", "most-ipl-sixes-era"],
  },
  "AB de Villiers": {
    nickname: "Mr 360",
    tags: ["360-player", "innovation-specialist", "rcb-icon", "impossible-shot-maker", "match-finisher"],
    moments: ["kohli-ab-rcb-partnerships", "360-degree-ipl-innings"],
  },
  "Kieron Pollard": {
    nickname: "Polly",
    tags: ["mi-icon", "power-finisher", "big-match-player", "boundary-rider", "death-overs-hitter"],
    moments: ["mi-finisher-legacy", "multiple-title-core"],
  },
  "Lasith Malinga": {
    nickname: "Slinga",
    tags: ["mi-icon", "yorker-king", "sling-action", "death-overs-master", "purple-cap-calibre"],
    moments: ["2019-final-last-over", "mi-death-bowling-legacy"],
  },
  "Andre Russell": {
    nickname: "Dre Russ",
    tags: ["muscle-russell", "kkr-icon", "six-machine", "impact-allrounder", "chaos-finisher"],
    moments: ["2019-mvp-season", "impossible-kkr-chases"],
  },
  "Sunil Narine": {
    tags: ["kkr-icon", "mystery-spinner", "pinch-hitter", "dual-role-reinvention", "powerplay-disruptor"],
    moments: ["mystery-spin-breakout", "opener-reinvention"],
  },
  "Rashid Khan": {
    tags: ["afghan-superstar", "mystery-spinner", "economy-strangler", "lower-order-hitter", "modern-t20-specialist"],
    moments: ["srh-spin-impact", "gt-title-core"],
  },
  "Suresh Raina": {
    nickname: "Mr IPL",
    tags: ["mr-ipl", "csk-icon", "left-handed-top-order", "playoff-performer", "old-school-ipl-legend"],
    moments: ["csk-run-machine-era", "early-ipl-consistency"],
  },
};

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeCountry(value) {
  const raw = String(value || "").trim();
  return COUNTRY_CODES[raw.toUpperCase()] || raw || "Unknown";
}

function normalizeTeam(value) {
  const raw = String(value || "").trim();
  return TEAM_CODES[raw.toUpperCase()] || raw;
}

function normalizeRole(value) {
  const role = String(value || "unknown").toLowerCase().trim();
  if (role.includes("all")) return "all-rounder";
  if (role.includes("wicket") || role === "wk") return "wicket-keeper";
  if (role.includes("bowl")) return "bowler";
  if (role.includes("bat")) return "batsman";
  return ROLE_VALUES.has(role) ? role : "unknown";
}

function normalizeYear(value) {
  const year = Number(value);
  return Number.isInteger(year) && year >= 2008 && year <= 2026 ? year : 0;
}

function asArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function mergePlayers(basePlayers, seedPlayers) {
  const merged = new Map();

  for (const source of [...basePlayers, ...seedPlayers]) {
    const name = source.fullName || source.name || source.Player;
    if (!name) continue;
    const key = name.toLowerCase();
    const existing = merged.get(key) || {};
    const next = { ...existing, ...source, name };
    next.id = next.id || slugify(name);
    next.teams = unique([...asArray(existing.teams), ...asArray(source.teams), source.currentTeam].map(normalizeTeam));
    next.historicalTeams = unique([...asArray(existing.historicalTeams), ...asArray(source.historicalTeams)].map(normalizeTeam));
    merged.set(key, next);
  }

  return [...merged.values()];
}

function getMetric(metrics, player) {
  return metrics[player.id] || metrics[slugify(player.name)] || metrics[slugify(player.shortName)] || null;
}

function deriveEra(debutYear, lastYear, active) {
  if (!debutYear) return active ? "modern-era" : "unknown-era";
  if (debutYear <= 2010) return "earlyIPLera";
  if (debutYear <= 2014) return "goldenEraPlayer";
  if (debutYear <= 2017) return "pre2018Peak";
  if (debutYear <= 2020) return "megaAuctionBridge";
  if (debutYear <= 2023) return "post2020Player";
  return "modernT20Specialist";
}

function ageGroupFromEra(debutYear, lastYear, active) {
  if (active && debutYear >= 2022) return "emerging";
  if (active && debutYear <= 2015) return "veteran";
  if (!active && lastYear && lastYear <= 2014) return "retired-early-era";
  if (!active) return "retired";
  return "prime";
}

function dominantEra(seasons = [], debutYear = 0) {
  const years = seasons.length ? seasons : [debutYear].filter(Boolean);
  const buckets = [
    ["2008-2010", (y) => y >= 2008 && y <= 2010],
    ["2011-2015", (y) => y >= 2011 && y <= 2015],
    ["2016-2020", (y) => y >= 2016 && y <= 2020],
    ["2021-2026", (y) => y >= 2021 && y <= 2026],
  ];
  let best = "unknown";
  let bestCount = 0;
  for (const [label, test] of buckets) {
    const count = years.filter(test).length;
    if (count > bestCount) {
      best = label;
      bestCount = count;
    }
  }
  return best;
}

function bowlingFlags(style = "") {
  const lower = style.toLowerCase();
  const spinner = ["spin", "break", "orthodox", "chinaman", "mystery"].some((token) => lower.includes(token));
  const pacer = ["fast", "medium", "pace"].some((token) => lower.includes(token)) && !spinner;
  return { spinner, pacer, mysterySpinner: lower.includes("mystery") || lower.includes("carrom") };
}

function strongestAssociation(player) {
  const teams = player.teams || [];
  const current = player.currentTeam;
  const known = KNOWN_DNA[player.name]?.tags?.find((tag) => tag.endsWith("-icon") || tag.endsWith("-legend"));
  if (known) return known;
  if (teams.length === 1 && current) return `${franchiseCode(current)}-loyalist`;
  if (current) return `${franchiseCode(current)}-current`;
  return "multi-franchise";
}

function franchiseCode(team = "") {
  const found = Object.entries(TEAM_CODES).find(([, name]) => name === team);
  if (found) return found[0].toLowerCase();
  return slugify(team);
}

function tacticalTags(player, metric) {
  const tags = [];
  if (player.opener) tags.push("opener", "topOrder");
  if (player.middleOrder) tags.push("middleOrder");
  if (player.battingPosition === "middle-lower" || player.finisher) tags.push("lowerOrder");
  if (player.finisher) tags.push("finisher");
  if (player.anchorBatter) tags.push("anchor", "accumulator");
  if (player.powerHitter || player.aggressive) tags.push("aggressor");
  if (player.wicketKeeper) tags.push("wicketkeeper");
  if (player.captain) tags.push("captain");
  if (player.spinner) tags.push("spinner");
  if (player.pacer) tags.push("pacer");
  if (player.deathBowler) tags.push("deathBowler");
  if (metric?.deathBowlingShare >= 20) tags.push("deathBowler");
  if (player.famousForYorkers) tags.push("yorkerSpecialist");
  if (player.bowlingStyle?.toLowerCase().includes("swing")) tags.push("swingBowler");
  if (player.mysterySpinner) tags.push("mysterySpinner");
  return unique(tags);
}

function playerDna(player, metric) {
  const known = KNOWN_DNA[player.name] || {};
  const tags = new Set([...(player.dnaTags || []), ...(known.tags || [])]);
  const add = (...values) => values.filter(Boolean).forEach((value) => tags.add(value));

  add(...tacticalTags(player, metric));
  add(player.overseas ? "overseas-player" : "indian-player");
  add(player.retired ? "retired-player" : "active-player");
  add(player.iconic && "ipl-icon", player.fanFavorite && "fan-favorite");
  add(player.teams?.length >= 4 && "journeyman-player");
  add(player.teams?.length === 1 && "one-franchise-player");
  add(player.debutYear <= 2010 && player.debutYear > 0 && "early-ipl-player");
  add(player.debutYear >= 2021 && "post-2020-player");
  add(metric?.matches >= 150 && "long-career-player");
  add(metric?.matches > 0 && metric.matches <= 10 && "short-career-player");
  add(metric?.runs >= 4000 && "elite-run-scorer");
  add(metric?.wickets >= 100 && "elite-wicket-taker");
  add(metric?.playerOfMatch >= 10 && "match-winner");

  return {
    tacticalIdentity: classifyArchetype(player),
    personalityIdentity: known.leadership || (player.captain ? "leadership-presence" : player.fanFavorite ? "crowd-connect-player" : "low-profile-professional"),
    playstyleEmbeddings: [...tags].sort(),
    emotionalTags: unique([
      player.fanFavorite && "fan-favorite",
      player.iconic && "high-recall",
      player.playoffsHero && "clutch-player",
      player.retired && "nostalgia",
      metric?.matches <= 10 && "obscure",
    ]),
    historicalTags: unique([
      deriveEra(player.debutYear, player.IPLLastYear, player.active),
      player.debutYear <= 2010 && "oldSchoolLegend",
      player.debutYear >= 2021 && "modernT20Specialist",
      player.IPLLastYear && player.IPLLastYear < 2015 && "forgotten-era-player",
    ]),
    pressureTraits: unique([
      player.finisher && "death-over-batter",
      player.deathBowler && "death-over-bowler",
      player.playoffsHero && "playoff-temperament",
      player.captain && "decision-maker",
      player.anchorBatter && "stabilizer",
    ]),
  };
}

function classifyArchetype(player) {
  if (player.wicketKeeper && player.captain) return "keeper-captain";
  if (player.wicketKeeper && player.finisher) return "keeper-finisher";
  if (player.opener && player.powerHitter) return "explosive-opener";
  if (player.opener && player.anchorBatter) return "anchor-opener";
  if (player.finisher && player.powerHitter) return "power-finisher";
  if (player.mysterySpinner) return "mystery-spinner";
  if (player.deathBowler && player.pacer) return "death-overs-pacer";
  if (player.spinner && player.role === "all-rounder") return "spin-allrounder";
  if (player.pacer && player.role === "all-rounder") return "pace-allrounder";
  if (player.spinner) return "specialist-spinner";
  if (player.pacer) return "pace-bowler";
  if (player.anchorBatter) return "accumulator";
  if (player.powerHitter) return "power-hitter";
  return player.role || "utility-player";
}

function questionAttributes(player, metric) {
  return {
    leadershipReputation: player.titleWinningCaptain ? "title-winning-captain" : player.captain ? "captaincy-experience" : "non-captain",
    franchiseIdentity: strongestAssociation(player),
    fanFavorite: Boolean(player.fanFavorite),
    underdog: !player.iconic && !player.fanFavorite && (metric?.matches || 0) < 40,
    cultPlayer: Boolean(player.fanFavorite && !player.iconic),
    oneSeasonWonder: metric?.seasons?.length === 1 || Boolean(player.replacementPlayerStatus?.oneSeasonWonder),
    consistentPerformer: (metric?.runs || 0) >= 2000 || (metric?.wickets || 0) >= 75 || (metric?.matches || 0) >= 100,
    injuryProne: Boolean(player.injuryProne),
    underrated: !player.iconic && ((metric?.runs || 0) >= 1000 || (metric?.wickets || 0) >= 40),
    IPLSpecialist: Boolean(player.fanFavorite || player.iconic || (metric?.matches || 0) >= 80),
    internationalStar: Boolean(player.overseas || player.iconic),
    domesticSpecialist: !player.overseas && !player.iconic && !player.fanFavorite,
  };
}

function questionBankSignals(player, metric) {
  return {
    broadSplitSignals: unique([
      player.overseas ? "overseas" : "indian",
      player.role,
      player.active ? "active" : "inactive-retired",
      player.historicalIPLLayer?.post2020Player ? "modern" : "historical",
    ]),
    midGameSignals: unique([
      player.opener && "opener",
      player.middleOrder && "middle-order",
      player.finisher && "finisher",
      player.wicketKeeper && "wicketkeeper",
      player.spinner && "spinner",
      player.pacer && "pacer",
      player.captain && "captain",
      player.strongestFranchiseAssociation,
    ]),
    precisionSignals: unique([
      player.currentTeam && `current-team:${player.currentTeam}`,
      ...(player.teams || []).map((team) => `played-for:${team}`),
      player.country && `country:${player.country}`,
      player.bowlingStyle && `bowling-style:${player.bowlingStyle}`,
      player.battingHand && `batting-hand:${player.battingHand}`,
    ]),
    highInformationQuestions: unique([
      player.dominantEra !== "unknown" && `dominant-era:${player.dominantEra}`,
      player.franchiseLoyalty && `franchise-loyalty:${player.franchiseLoyalty}`,
      metric?.matches <= 10 && "short-career",
      metric?.matches >= 100 && "long-career",
      player.questionAttributes?.IPLSpecialist && "ipl-specialist",
      player.questionAttributes?.domesticSpecialist && "domestic-specialist",
    ]),
    avoidGenericIfKnown: unique([
      player.role !== "unknown" && "role-known",
      player.country !== "Unknown" && "country-known",
      player.teams?.length && "franchise-known",
      player.dnaTags?.length >= 8 && "semantic-known",
    ]),
  };
}

function candidateRankingFeatures(player, metric) {
  const popularity = Number(player.popularityScore || 0);
  const matches = Number(metric?.matches || 0);
  const recall = Math.min(1, (popularity / 100) * 0.5 + Math.min(matches, 200) / 400 + (player.iconic ? 0.25 : 0));

  return {
    priorWeight: Number((1 + recall + (player.active ? 0.15 : 0)).toFixed(3)),
    recallScore: Number(recall.toFixed(3)),
    obscurityPenalty: ["forgotten", "legendary-obscure", "niche"].includes(player.obscurityProfile?.rarity) ? 0.15 : 0,
    semanticDensity: player.dnaTags?.length || 0,
    teamSpecificity: player.teams?.length === 1 ? 0.9 : player.teams?.length >= 4 ? 0.65 : 0.75,
    eraSpecificity: player.dominantEra === "unknown" ? 0.2 : 0.8,
    roleSpecificity: player.role === "unknown" ? 0.2 : 0.85,
    confidenceFloor: player.obscurityProfile?.rarity === "common" ? 0.45 : 0.2,
    finalGuessBoosts: unique([
      player.iconic && "iconic",
      player.fanFavorite && "fan-favorite",
      player.active && "active",
      player.questionAttributes?.consistentPerformer && "consistent",
      player.obscurityProfile?.rarity === "legendary-obscure" && "needs-extra-evidence",
    ]),
  };
}

function performanceProfile(player, metric) {
  return {
    matches: metric?.matches || 0,
    seasons: metric?.seasons || player.seasonsPlayed || [],
    runs: metric?.runs || 0,
    wickets: metric?.wickets || 0,
    strikeRate: metric?.strikeRate || 0,
    boundaryRate: metric?.boundaryRate || 0,
    sixRate: metric?.sixRate || 0,
    dotBallRate: metric?.dotBallRate || 0,
    deathBowlingShare: metric?.deathBowlingShare || 0,
    playerOfMatch: metric?.playerOfMatch || 0,
    primaryBattingPosition: metric?.primaryBattingPosition || null,
    statisticalIdentity: unique([
      metric?.runs >= 4000 && "elite-batter",
      metric?.runs >= 1000 && metric?.runs < 4000 && "established-batter",
      metric?.wickets >= 100 && "elite-bowler",
      metric?.wickets >= 40 && metric?.wickets < 100 && "established-bowler",
      metric?.strikeRate >= 145 && "high-strike-rate",
      metric?.deathBowlingShare >= 25 && "death-over-usage",
      metric?.playerOfMatch >= 10 && "frequent-match-winner",
    ]),
  };
}

function aiEnrichmentHints(player, metric) {
  return {
    needsAI: player.obscurityProfile?.dataConfidence?.semantic < 0.75 || !player.iconicMoments?.length,
    safePromptFacts: unique([
      player.name,
      player.country,
      player.role,
      player.currentTeam,
      player.IPLDebutYear && `debut:${player.IPLDebutYear}`,
      player.IPLLastYear && `last:${player.IPLLastYear}`,
      ...(player.teams || []),
    ]),
    requestedFields: [
      "nickname",
      "semanticTags",
      "franchiseAssociation",
      "tacticalArchetype",
      "iconicMoments",
      "obscureDifferentiators",
    ],
    validationRules: [
      "no invented teams",
      "years must be 2008-2026",
      "tags must be kebab-case",
      "preserve deterministic fields when model confidence is low",
    ],
  };
}

function failureLearningProfile(player, metric) {
  return {
    failureBucket: player.obscurityProfile?.rarity || "unknown",
    likelyConfusions: unique([
      player.role,
      player.currentTeam,
      player.country,
      player.battingHand,
      player.spinner && "other-spinners",
      player.pacer && "other-pacers",
      player.wicketKeeper && "other-wicketkeepers",
    ]),
    missingDifferentiators: unique([
      !player.iconicMoments?.length && "iconic-moment",
      !player.auctionHistory?.length && "auction-history",
      !player.seasonsPlayed?.length && "season-history",
      (player.dnaTags?.length || 0) < 8 && "semantic-tags",
      !metric && "statistical-profile",
    ]),
    nextEnrichmentActions: unique([
      "record-failed-questions",
      "compare-against-top-confused-candidates",
      "add-question-aware-tags",
      !player.iconicMoments?.length && "find-memory-hook",
      !player.auctionHistory?.length && "add-auction-history",
    ]),
  };
}

function iconicMoments(player, metric) {
  const moments = new Set([...(player.iconicMoments || []), ...(KNOWN_DNA[player.name]?.moments || [])]);
  if (player.orangeCap) moments.add("orange-cap-season");
  if (player.purpleCap) moments.add("purple-cap-season");
  if (player.titleWinningCaptain) moments.add("title-winning-captaincy");
  if (player.playoffsHero) moments.add("playoff-impact");
  if (metric?.runs >= 5000) moments.add("5000-plus-ipl-runs");
  if (metric?.wickets >= 150) moments.add("150-plus-ipl-wickets");
  return [...moments].sort();
}

function semanticVector(player, dna) {
  const tags = new Set([
    player.role,
    player.country,
    player.currentTeam,
    player.strongestFranchiseAssociation,
    ...dna.playstyleEmbeddings,
    ...dna.historicalTags,
    ...dna.pressureTraits,
  ]);
  return [...tags].filter(Boolean).map((tag) => slugify(tag)).sort();
}

function enrichPlayer(raw, metadata, metrics, aiCache) {
  const meta = metadata[raw.name] || {};
  const metric = getMetric(metrics, raw);
  const seasons = unique([...(metric?.seasons || []), ...asArray(raw.seasonsPlayed)].map(Number).filter(Boolean)).sort((a, b) => a - b);
  const debutYear = normalizeYear(raw.IPLDebutYear || raw.debutYear || seasons[0]) || 0;
  const lastYear = normalizeYear(raw.IPLLastYear || seasons[seasons.length - 1] || (raw.active ? 2026 : 0)) || 0;
  const country = normalizeCountry(raw.nationality || raw.country || raw.countryCode);
  const bowlingStyle = raw.bowlingStyle || meta.bowl || "none";
  const bowling = bowlingFlags(bowlingStyle);
  const currentTeam = normalizeTeam(raw.currentTeam || raw.latestSeasonTeam || raw.teamCode || raw.TEAM || raw.teams?.[0] || "");
  const teams = unique([...asArray(raw.teams), currentTeam, ...asArray(raw.allTeamsPlayedFor)].map(normalizeTeam));
  const role = normalizeRole(raw.primaryRole || raw.role);

  const player = {
    ...raw,
    id: raw.id || slugify(raw.name),
    name: raw.name,
    fullName: raw.fullName || raw.name,
    shortName: raw.shortName || raw.name.split(" ").slice(-1)[0],
    nickname: raw.nickname || KNOWN_DNA[raw.name]?.nickname || "",
    nationality: country,
    country,
    overseas: raw.overseas ?? country !== "India",
    ageGroup: ageGroupFromEra(debutYear, lastYear, raw.active),
    activeStatus: raw.active ? "active" : raw.retired ? "retired" : "inactive",
    active: Boolean(raw.active),
    retired: raw.retired ?? !raw.active,
    IPLDebutYear: debutYear,
    IPLLastYear: lastYear,
    debutYear,
    dominantEra: dominantEra(seasons, debutYear),
    battingHand: raw.battingHand || raw.battingStyle || meta.bat || "unknown",
    battingStyle: raw.battingStyle || meta.bat || "unknown",
    bowlingStyle,
    primaryRole: role,
    secondaryRole: raw.secondaryRole || inferSecondaryRole(raw, bowling),
    role,
    currentTeam,
    latestSeasonTeam: currentTeam,
    allTeamsPlayedFor: teams,
    teams,
    historicalTeams: unique([...asArray(raw.historicalTeams), ...teams.filter((team) => team !== currentTeam)].map(normalizeTeam)),
    strongestFranchiseAssociation: raw.strongestFranchiseAssociation || "",
    franchiseLoyalty: teams.length === 1 ? "one-franchise" : teams.length >= 4 ? "journeyman" : "multi-franchise",
    seasonsPlayed: seasons,
    auctionHistory: raw.auctionHistory || [],
    replacementPlayerStatus: raw.replacementPlayerStatus || { replacement: false, temporarySigning: false, netReplacement: false },
    wicketKeeper: Boolean(raw.wicketKeeper ?? meta.wk),
    leftHanded: Boolean(raw.leftHanded ?? meta.left ?? String(meta.bat || raw.battingStyle || "").toLowerCase().includes("left")),
    spinner: Boolean(raw.spinner ?? bowling.spinner),
    pacer: Boolean(raw.pacer ?? bowling.pacer),
    mysterySpinner: Boolean(raw.mysterySpinner ?? bowling.mysterySpinner),
    battingPosition: BAT_POSITIONS.has(raw.battingPosition) ? raw.battingPosition : "middle",
    titlesWon: Number(raw.titlesWon || 0),
  };

  for (const field of LEGACY_BOOLEAN_FIELDS) {
    player[field] = Boolean(player[field]);
  }

  player.strongestFranchiseAssociation = player.strongestFranchiseAssociation || strongestAssociation(player);
  player.era = raw.era || deriveEra(debutYear, lastYear, player.active);
  player.tacticalTags = tacticalTags(player, metric);
  player.playerDNA = playerDna(player, metric);
  player.dnaTags = unique([...(raw.dnaTags || []), ...player.playerDNA.playstyleEmbeddings]);
  player.historicalIPLLayer = {
    earlyIPLera: debutYear > 0 && debutYear <= 2010,
    goldenEraPlayer: debutYear >= 2011 && debutYear <= 2015,
    pre2015Peak: player.dominantEra === "2011-2015" || player.dominantEra === "2008-2010",
    post2020Player: debutYear >= 2021,
    oldSchoolLegend: player.retired && debutYear > 0 && debutYear <= 2012,
    modernT20Specialist: debutYear >= 2021 || player.active,
  };
  player.iconicMoments = iconicMoments(player, metric);
  player.questionAttributes = questionAttributes(player, metric);
  player.questionBankSignals = questionBankSignals(player, metric);
  player.performanceProfile = performanceProfile(player, metric);
  player.obscurityProfile = {
    rarity: raw.rarity || classifyRarity(player, metric),
    nicheIdentifiers: nicheIdentifiers(player, metric),
    semanticDifferentiators: semanticDifferentiators(player, metric),
    dataConfidence: confidenceProfile(player, metric),
  };
  player.candidateRankingFeatures = candidateRankingFeatures(player, metric);
  player.aiEnrichmentHints = aiEnrichmentHints(player, metric);
  player.failureLearningProfile = failureLearningProfile(player, metric);
  player.semanticVector = semanticVector(player, player.playerDNA);
  player.searchText = unique([
    player.name,
    player.nickname,
    player.country,
    player.currentTeam,
    player.role,
    ...player.teams,
    ...player.dnaTags,
    ...player.iconicMoments,
  ]).join(" ").toLowerCase();

  if (useAi && aiCache[player.name]) {
    mergeAiEnrichment(player, aiCache[player.name]);
  }

  return player;
}

function inferSecondaryRole(raw, bowling) {
  if (raw.wicketKeeper) return "wicket-keeper";
  if (bowling.spinner) return "spinner";
  if (bowling.pacer) return "pacer";
  if (raw.finisher) return "finisher";
  if (raw.opener) return "opener";
  return "";
}

function classifyRarity(player, metric) {
  if (player.iconic || player.popularityScore >= 85) return "common";
  if (player.fanFavorite || player.captain || metric?.matches >= 80) return "rare";
  if (metric?.matches > 0 && metric.matches <= 10) return "legendary-obscure";
  if (player.retired && player.IPLLastYear < 2015) return "forgotten";
  return "niche";
}

function nicheIdentifiers(player, metric) {
  return unique([
    metric?.matches <= 10 && "very-short-ipl-career",
    player.questionAttributes?.oneSeasonWonder && "one-season-wonder",
    player.replacementPlayerStatus?.replacement && "replacement-player",
    player.overseas && player.obscurityProfile?.rarity !== "common" && "low-recall-overseas",
    !player.overseas && !player.iconic && "uncapped-or-domestic-indian",
    player.teams?.length >= 4 && "multi-franchise-journeyman",
    player.IPLLastYear && player.IPLLastYear < 2015 && "early-era-memory-test",
  ]);
}

function semanticDifferentiators(player, metric) {
  return unique([
    player.currentTeam && `current-${franchiseCode(player.currentTeam)}`,
    player.strongestFranchiseAssociation,
    player.battingHand?.toLowerCase().includes("left") && "left-hand-bat",
    player.bowlingStyle && player.bowlingStyle !== "none" && slugify(player.bowlingStyle),
    player.IPLDebutYear && `debut-${player.IPLDebutYear}`,
    metric?.matches && `matches-${bucket(metric.matches, [10, 50, 100, 150, 200])}`,
    metric?.runs && `runs-${bucket(metric.runs, [500, 1000, 2500, 5000])}`,
    metric?.wickets && `wickets-${bucket(metric.wickets, [25, 50, 100, 150])}`,
  ]);
}

function bucket(value, limits) {
  for (const limit of limits) {
    if (value <= limit) return `under-${limit}`;
  }
  return `over-${limits[limits.length - 1]}`;
}

function confidenceProfile(player, metric) {
  return {
    identity: 1,
    country: player.country && player.country !== "Unknown" ? 0.95 : 0.2,
    role: player.role !== "unknown" ? 0.9 : 0.25,
    teams: player.teams?.length ? 0.85 : 0.2,
    seasons: player.seasonsPlayed?.length ? 0.8 : metric?.seasons?.length ? 0.75 : 0.25,
    semantic: player.dnaTags?.length >= 5 ? 0.85 : 0.55,
  };
}

function mergeAiEnrichment(player, ai) {
  const allowedKeys = ["nickname", "dnaTags", "iconicMoments", "replacementPlayerStatus", "auctionHistory"];
  for (const key of allowedKeys) {
    if (key === "dnaTags" || key === "iconicMoments") {
      player[key] = unique([...asArray(player[key]), ...asArray(ai[key])]);
    } else if (ai[key] !== undefined) {
      player[key] = ai[key];
    }
  }
}

async function refreshAiCacheIfRequested(players, existingCache) {
  if (!useAi) return existingCache;

  const geminiKey = process.env.GEMINI_API_KEY || "";
  const openRouterKey = process.env.OPENROUTER_API_KEY || "";
  if (!geminiKey && !openRouterKey) {
    console.warn("AI enrichment requested, but GEMINI_API_KEY/OPENROUTER_API_KEY are not configured. Using cache only.");
    return existingCache;
  }

  const nextCache = { ...existingCache };
  const targets = players
    .filter((player) => !nextCache[player.name])
    .filter((player) => player.aiEnrichmentHints?.needsAI)
    .slice(0, Number.isFinite(aiLimit) ? aiLimit : undefined);

  for (const player of targets) {
    try {
      const enrichment = await requestAiEnrichment(player, { geminiKey, openRouterKey });
      const validated = validateAiEnrichment(enrichment);
      if (validated) nextCache[player.name] = validated;
    } catch (error) {
      console.warn(`AI enrichment skipped for ${player.name}: ${error.message}`);
    }
  }

  if (writeMode && targets.length) {
    fs.mkdirSync(path.dirname(paths.aiCache), { recursive: true });
    fs.writeFileSync(paths.aiCache, `${JSON.stringify(nextCache, null, 2)}\n`);
  }

  return nextCache;
}

async function requestAiEnrichment(player, keys) {
  const prompt = `You are enriching an IPL player knowledge graph. Return JSON only.

Player facts:
${JSON.stringify(player.aiEnrichmentHints.safePromptFacts, null, 2)}

Create only these fields:
{
  "nickname": "",
  "dnaTags": ["kebab-case-tags"],
  "iconicMoments": ["kebab-case-moments"],
  "replacementPlayerStatus": {"replacement": false, "temporarySigning": false, "netReplacement": false},
  "auctionHistory": []
}

Rules:
- Do not invent IPL teams.
- Do not use years outside 2008-2026.
- Keep tags short, factual, and IPL-specific.
- If unsure, omit the field or return an empty array.`;

  if (keys.geminiKey) {
    try {
      return parseJsonBlock(await callGemini(prompt, keys.geminiKey));
    } catch (error) {
      if (!keys.openRouterKey) throw error;
    }
  }

  return parseJsonBlock(await callOpenRouter(prompt, keys.openRouterKey));
}

async function callGemini(prompt, apiKey) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini enrichment failed with ${response.status}`);
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no enrichment text");
  return text;
}

async function callOpenRouter(prompt, apiKey) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://iplmind.app",
      "X-Title": "IPLMind",
    },
    body: JSON.stringify({
      model: "google/gemini-2.0-flash-001",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 1200,
    }),
  });

  if (!response.ok) throw new Error(`OpenRouter enrichment failed with ${response.status}`);
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("OpenRouter returned no enrichment text");
  return text;
}

function parseJsonBlock(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  return JSON.parse(cleaned);
}

function validateAiEnrichment(candidate) {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return null;
  const clean = {};

  if (typeof candidate.nickname === "string") clean.nickname = candidate.nickname.trim().slice(0, 80);
  if (Array.isArray(candidate.dnaTags)) clean.dnaTags = candidate.dnaTags.map(cleanTag).filter(Boolean).slice(0, 16);
  if (Array.isArray(candidate.iconicMoments)) clean.iconicMoments = candidate.iconicMoments.map(cleanTag).filter(Boolean).slice(0, 12);
  if (candidate.replacementPlayerStatus && typeof candidate.replacementPlayerStatus === "object") {
    clean.replacementPlayerStatus = {
      replacement: Boolean(candidate.replacementPlayerStatus.replacement),
      temporarySigning: Boolean(candidate.replacementPlayerStatus.temporarySigning),
      netReplacement: Boolean(candidate.replacementPlayerStatus.netReplacement),
    };
  }
  if (Array.isArray(candidate.auctionHistory)) {
    clean.auctionHistory = candidate.auctionHistory
      .filter((entry) => entry && typeof entry === "object")
      .filter((entry) => !entry.year || (Number(entry.year) >= 2008 && Number(entry.year) <= 2026))
      .slice(0, 20);
  }

  return clean;
}

function cleanTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function buildIndex(players) {
  const byId = {};
  const byName = {};
  const byTeam = {};
  const byCountry = {};
  const byTag = {};
  const byEra = {};
  const search = {};

  for (const player of players) {
    byId[player.id] = player.name;
    byName[player.name.toLowerCase()] = player.id;
    addToIndex(byCountry, player.country, player.id);
    addToIndex(byEra, player.era, player.id);
    for (const team of player.teams || []) addToIndex(byTeam, team, player.id);
    for (const tag of player.semanticVector || []) addToIndex(byTag, tag, player.id);
    search[player.id] = player.searchText;
  }

  return { byId, byName, byTeam, byCountry, byTag, byEra, search };
}

function addToIndex(index, key, id) {
  if (!key) return;
  index[key] ||= [];
  index[key].push(id);
}

function validate(players) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const names = new Set();

  for (const player of players) {
    if (ids.has(player.id)) errors.push(`${player.name}: duplicate id ${player.id}`);
    if (names.has(player.name)) errors.push(`${player.name}: duplicate name`);
    ids.add(player.id);
    names.add(player.name);

    if (!player.name) errors.push(`${player.id}: missing name`);
    if (!ROLE_VALUES.has(player.role)) errors.push(`${player.name}: invalid role ${player.role}`);
    if (!Array.isArray(player.teams) || player.teams.length === 0) warnings.push(`${player.name}: no team history`);
    if (!player.country || player.country === "Unknown") warnings.push(`${player.name}: missing country`);
    if (!player.dnaTags?.length) warnings.push(`${player.name}: missing dna tags`);
    for (const field of LEGACY_BOOLEAN_FIELDS) {
      if (typeof player[field] !== "boolean") errors.push(`${player.name}: ${field} must be boolean`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

function buildSchema() {
  return {
    version: "iplmind-player-knowledge-graph-v1",
    generatedAt: new Date().toISOString(),
    backwardsCompatibleFields: LEGACY_BOOLEAN_FIELDS,
    requiredCore: [
      "id",
      "name",
      "fullName",
      "shortName",
      "nationality",
      "overseas",
      "ageGroup",
      "activeStatus",
      "retired",
      "IPLDebutYear",
      "IPLLastYear",
      "dominantEra",
      "battingHand",
      "bowlingStyle",
      "primaryRole",
      "secondaryRole",
      "currentTeam",
      "allTeamsPlayedFor",
      "strongestFranchiseAssociation",
      "franchiseLoyalty",
      "seasonsPlayed",
      "auctionHistory",
      "replacementPlayerStatus",
      "tacticalTags",
      "playerDNA",
      "historicalIPLLayer",
      "iconicMoments",
      "questionAttributes",
      "questionBankSignals",
      "candidateRankingFeatures",
      "performanceProfile",
      "aiEnrichmentHints",
      "failureLearningProfile",
      "obscurityProfile",
      "semanticVector",
    ],
  };
}

function buildReport(players, validation, sourceCounts) {
  const countries = unique(players.map((p) => p.country)).sort();
  const teams = unique(players.flatMap((p) => p.teams || [])).sort();
  const roleBreakdown = countBy(players, (p) => p.role);
  const rarityBreakdown = countBy(players, (p) => p.obscurityProfile?.rarity || "unknown");
  const gaps = gapReport(players);

  return {
    source: "players.json + playerMetadata + player-metrics + ipl2026squads + optional master/AI cache",
    generatedAt: new Date().toISOString(),
    playerCount: players.length,
    lineCountEstimate: JSON.stringify(players, null, 2).split(/\r?\n/).length,
    sourceCounts,
    countriesRepresented: countries,
    teamsRepresented: teams,
    rolesBreakdown: roleBreakdown,
    rarityBreakdown,
    metadataCoverage: {
      withCountry: players.filter((p) => p.country && p.country !== "Unknown").length,
      withBattingStyle: players.filter((p) => p.battingStyle && p.battingStyle !== "unknown").length,
      withBowlingStyle: players.filter((p) => p.bowlingStyle && p.bowlingStyle !== "unknown").length,
      withDna: players.filter((p) => p.dnaTags?.length >= 5).length,
      withSemanticVector: players.filter((p) => p.semanticVector?.length).length,
      withSeasons: players.filter((p) => p.seasonsPlayed?.length).length,
    },
    hiddenMetadataGaps: gaps.hiddenMetadataGaps,
    targetAssessment: players.length >= 700 && JSON.stringify(players, null, 2).split(/\r?\n/).length >= 50000
      ? "AI-Grade IPL Knowledge Graph Ready"
      : "Mostly Expanded - needs all-era master seed data to guarantee every IPL player",
    validation,
  };
}

function gapReport(players) {
  const missing = [];
  for (const player of players) {
    const gaps = [];
    if (!player.country || player.country === "Unknown") gaps.push("country");
    if (!player.seasonsPlayed?.length) gaps.push("season-history");
    if (!player.auctionHistory?.length) gaps.push("auction-history");
    if (!player.iconicMoments?.length && (player.iconic || player.fanFavorite)) gaps.push("iconic-moments");
    if (player.obscurityProfile?.dataConfidence?.semantic < 0.7) gaps.push("semantic-dna");
    if (gaps.length) missing.push({ id: player.id, name: player.name, gaps });
  }

  return {
    hiddenMetadataGaps: {
      missingCountry: missing.filter((m) => m.gaps.includes("country")).length,
      missingSeasonHistory: missing.filter((m) => m.gaps.includes("season-history")).length,
      missingAuctionHistory: missing.filter((m) => m.gaps.includes("auction-history")).length,
      weakSemanticDNA: missing.filter((m) => m.gaps.includes("semantic-dna")).length,
    },
    playersNeedingEnrichment: missing,
  };
}

function countBy(values, getKey) {
  return values.reduce((acc, value) => {
    const key = getKey(value) || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const basePlayers = readJson(paths.players, []);
  const metadata = readJson(paths.metadata, {});
  const metrics = readJson(paths.metrics, {});
  const squads2026 = readJson(paths.squads2026, []);
  const masterSeed = readJson(paths.masterSeed, []);
  let aiCache = readJson(paths.aiCache, {});

  const sourceCounts = {
    playersJson: basePlayers.length,
    squads2026: squads2026.length,
    masterSeed: masterSeed.length,
    aiCache: Object.keys(aiCache).length,
  };

  const merged = mergePlayers(basePlayers, [...squads2026, ...masterSeed]);
  let enriched = merged
    .map((player) => enrichPlayer(player, metadata, metrics, aiCache))
    .sort((a, b) => a.name.localeCompare(b.name));

  aiCache = await refreshAiCacheIfRequested(enriched, aiCache);
  if (useAi) {
    enriched = merged
      .map((player) => enrichPlayer(player, metadata, metrics, aiCache))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const validation = validate(enriched);
  const index = buildIndex(enriched);
  const schema = buildSchema();
  const report = buildReport(enriched, validation, sourceCounts);
  const gaps = gapReport(enriched);

  console.log(`Players: ${basePlayers.length} -> ${enriched.length}`);
  console.log(`Line count estimate: ${report.lineCountEstimate}`);
  console.log(`Validation: ${validation.valid ? "valid" : "invalid"} (${validation.errors.length} errors, ${validation.warnings.length} warnings)`);
  console.log(`Assessment: ${report.targetAssessment}`);

  if (dryRun) {
    console.log("Dry run only. Re-run with --write to update src/data artifacts.");
    return;
  }

  if (!validation.valid) {
    console.error(validation.errors.slice(0, 20).join("\n"));
    process.exit(1);
  }

  fs.writeFileSync(paths.outPlayers, `${JSON.stringify(enriched, null, 2)}\n`);
  fs.writeFileSync(paths.outIndex, `${JSON.stringify(index, null, 2)}\n`);
  fs.writeFileSync(paths.outSchema, `${JSON.stringify(schema, null, 2)}\n`);
  fs.writeFileSync(paths.outReport, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(paths.outGaps, `${JSON.stringify(gaps, null, 2)}\n`);
}

await main();
