import players from "@/data/players.json";

export const traitFields = [
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

export function getAllPlayers() {
  return players;
}

export function searchPlayers(query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return players;

  return players.filter((player) => {
    const haystack = [
      player.id,
      player.name,
      player.country,
      player.role,
      player.battingStyle,
      player.bowlingStyle,
      player.battingPosition,
      ...player.teams,
    ]
      .map(normalize)
      .join(" ");

    return haystack.includes(normalizedQuery);
  });
}

export function filterPlayers(filters = {}) {
  return players.filter((player) =>
    Object.entries(filters).every(([key, expected]) => {
      if (expected === undefined || expected === null || expected === "") return true;

      const actual = player[key];
      if (Array.isArray(actual)) {
        const expectedValues = Array.isArray(expected) ? expected : [expected];
        return expectedValues.every((value) => actual.includes(value));
      }

      if (Array.isArray(expected)) return expected.includes(actual);
      return actual === expected;
    })
  );
}

export function getUniqueAttributes(attribute) {
  const values = new Set();

  players.forEach((player) => {
    const value = player[attribute];
    if (Array.isArray(value)) {
      value.forEach((item) => values.add(item));
    } else if (value !== undefined && value !== null && value !== "") {
      values.add(value);
    }
  });

  return [...values].sort((a, b) => String(a).localeCompare(String(b)));
}

export function getPlayersByTrait(trait, expected = true) {
  if (!traitFields.includes(trait)) return [];
  return players.filter((player) => player[trait] === expected);
}

export function calculatePlayerSimilarity(playerA, playerB) {
  const left = resolvePlayer(playerA);
  const right = resolvePlayer(playerB);

  if (!left || !right) return 0;

  let score = 0;
  let weight = 0;

  score += left.role === right.role ? 2 : 0;
  weight += 2;

  score += left.battingPosition === right.battingPosition ? 1 : 0;
  weight += 1;

  score += left.battingStyle === right.battingStyle ? 0.75 : 0;
  weight += 0.75;

  score += left.bowlingStyle === right.bowlingStyle ? 0.75 : 0;
  weight += 0.75;

  const teamOverlap = intersectionRatio(left.teams, right.teams);
  score += teamOverlap * 1.5;
  weight += 1.5;

  for (const trait of traitFields) {
    score += left[trait] === right[trait] ? 1 : 0;
    weight += 1;
  }

  return Number((score / weight).toFixed(4));
}

function resolvePlayer(playerOrId) {
  if (!playerOrId) return null;
  if (typeof playerOrId === "object") return playerOrId;
  const query = normalize(playerOrId);
  return players.find((player) => normalize(player.id) === query || normalize(player.name) === query) || null;
}

function intersectionRatio(left = [], right = []) {
  if (!left.length && !right.length) return 1;
  const rightSet = new Set(right);
  const overlap = left.filter((item) => rightSet.has(item)).length;
  return overlap / Math.max(new Set([...left, ...right]).size, 1);
}

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
