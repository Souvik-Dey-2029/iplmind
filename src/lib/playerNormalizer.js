import playerAliases from "@/data/playerAliases.json";
import currentPlayerOverrides from "@/data/currentPlayerOverrides.json";

const teamAliases = new Map([
  ["csk", "Chennai Super Kings"],
  ["dc", "Delhi Capitals"],
  ["gt", "Gujarat Titans"],
  ["kkr", "Kolkata Knight Riders"],
  ["lsg", "Lucknow Super Giants"],
  ["mi", "Mumbai Indians"],
  ["pk", "Punjab Kings"],
  ["pbks", "Punjab Kings"],
  ["kxip", "Punjab Kings"],
  ["rcb", "Royal Challengers Bengaluru"],
  ["rr", "Rajasthan Royals"],
  ["srh", "Sunrisers Hyderabad"],
  ["delhi daredevils", "Delhi Capitals"],
  ["kings xi punjab", "Punjab Kings"],
  ["royal challengers bangalore", "Royal Challengers Bengaluru"],
  ["rising pune supergiants", "Rising Pune Supergiant"],
]);

const countryAliases = new Map([
  ["ind", "India"],
  ["india", "India"],
  ["aus", "Australia"],
  ["eng", "England"],
  ["nz", "New Zealand"],
  ["sa", "South Africa"],
  ["sl", "Sri Lanka"],
  ["wi", "West Indies"],
  ["afg", "Afghanistan"],
  ["ban", "Bangladesh"],
  ["zim", "Zimbabwe"],
  ["ire", "Ireland"],
  ["nep", "Nepal"],
]);

const latestTeamOverrides = {
  "Ravichandran Ashwin": "Chennai Super Kings",
  "Ravindra Jadeja": "Chennai Super Kings",
  "Bhuvneshwar Kumar": "Royal Challengers Bengaluru",
};

export function getCanonicalPlayerName(name) {
  const cleaned = cleanText(name);
  if (!cleaned) return "";
  return playerAliases[cleaned] || cleaned;
}

export function getCanonicalTeamName(team) {
  const cleaned = cleanText(team);
  if (!cleaned) return "";
  return teamAliases.get(normalizeKey(cleaned)) || cleaned;
}

export function sanitizeDisplayValue(value) {
  const cleaned = cleanText(value);
  if (!cleaned || isNullLike(cleaned)) return "";
  return cleaned;
}

export function sanitizePlayerForRender(player) {
  if (!player) return null;

  const facts = [
    sanitizeDisplayValue(player.country),
    sanitizeDisplayValue(player.role),
    sanitizeDisplayValue(player.latestSeasonTeam || player.currentTeam),
  ].filter(Boolean);

  return {
    ...player,
    name: getCanonicalPlayerName(player.name),
    country: sanitizeDisplayValue(player.country),
    role: sanitizeDisplayValue(player.role),
    currentTeam: sanitizeDisplayValue(player.currentTeam),
    latestSeasonTeam: sanitizeDisplayValue(player.latestSeasonTeam),
    teams: normalizeTeams(player.teams),
    historicalTeams: normalizeTeams(player.historicalTeams),
    displayFacts: facts,
  };
}

export function normalizePlayerProfiles(rawPlayers) {
  const seen = new Map();

  rawPlayers.forEach((rawPlayer, index) => {
    const canonicalName = getCanonicalPlayerName(rawPlayer.name);
    const override = currentPlayerOverrides[canonicalName] || {};
    const latestSeasonTeam = getCanonicalTeamName(
      latestTeamOverrides[canonicalName] ||
      override.latestSeasonTeam ||
      override.currentTeam ||
      rawPlayer.latestSeasonTeam ||
      rawPlayer.currentTeam
    );
    const historicalTeams = normalizeTeams([
      ...(rawPlayer.historicalTeams || []),
      ...(override.historicalTeams || []),
      ...(rawPlayer.teams || []),
    ]).filter((team) => team !== latestSeasonTeam);
    const teams = normalizeTeams([...(rawPlayer.teams || []), ...historicalTeams, latestSeasonTeam]);
    const normalized = {
      ...rawPlayer,
      ...override,
      id: rawPlayer.id || slugify(canonicalName),
      canonicalPlayerId: rawPlayer.id || slugify(canonicalName),
      name: canonicalName,
      country: normalizeCountry(override.country || rawPlayer.country),
      role: sanitizeDisplayValue(override.role || rawPlayer.role),
      battingStyle: sanitizeDisplayValue(override.battingStyle || rawPlayer.battingStyle),
      bowlingStyle: sanitizeDisplayValue(override.bowlingStyle || rawPlayer.bowlingStyle),
      primaryBattingPosition: normalizePrimaryBattingPosition(
        override.primaryBattingPosition || rawPlayer.primaryBattingPosition,
        sanitizeDisplayValue(override.role || rawPlayer.role)
      ),
      currentTeam: latestSeasonTeam,
      latestSeasonTeam,
      historicalTeams,
      teams,
      originalRawSource: {
        index,
        id: rawPlayer.id || "",
        name: rawPlayer.name || "",
        currentTeam: rawPlayer.currentTeam || "",
        source: "src/data/players.json",
      },
      normalizationResult: {
        name: canonicalName,
        currentTeam: latestSeasonTeam,
        historicalTeams,
      },
    };

    seen.set(normalized.name, mergeProfiles(seen.get(normalized.name), normalized));
  });

  return [...seen.values()].map(sanitizePlayerForRender);
}

function mergeProfiles(existing, next) {
  if (!existing) return next;
  return {
    ...existing,
    ...next,
    teams: normalizeTeams([...(existing.teams || []), ...(next.teams || [])]),
    historicalTeams: normalizeTeams([...(existing.historicalTeams || []), ...(next.historicalTeams || [])]),
  };
}

function normalizeCountry(country) {
  const cleaned = sanitizeDisplayValue(country);
  if (!cleaned) return "";
  return countryAliases.get(normalizeKey(cleaned)) || cleaned;
}

function normalizeTeams(teams = []) {
  return [
    ...new Set(
      teams
        .map(getCanonicalTeamName)
        .filter(Boolean)
        .filter((team) => !isNullLike(team))
    ),
  ];
}

function cleanText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeKey(value) {
  return cleanText(value).toLowerCase();
}

function isNullLike(value) {
  return /^(unknown|null|undefined|n\/a|na|-|none)$/i.test(cleanText(value));
}

function slugify(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Normalize primaryBattingPosition with intelligent fallback.
 * If null/missing, infer from role or use safe default.
 * Strategy: bowlers rarely bat, wicketkeepers often bat, batsmen position varies
 */
function normalizePrimaryBattingPosition(position, role) {
  // If position is provided and valid, use it
  const cleaned = sanitizeDisplayValue(position);
  if (cleaned) return cleaned;

  // If no position, infer intelligent default from role
  const normalizedRole = (role || "").toLowerCase();

  if (normalizedRole.includes("batsman")) {
    return "Middle Order"; // Default safe position for batsmen
  }
  if (normalizedRole.includes("wicket")) {
    return "Wicket-keeper"; // Wicketkeepers have fixed position
  }
  if (normalizedRole.includes("bowler") || normalizedRole.includes("all-rounder")) {
    return "Lower Order"; // Bowlers typically bat lower
  }

  // Final fallback for unknown role
  return "Middle Order";
}
