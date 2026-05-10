import players from "@/data/players";
import knowledgeIndex from "@/data/playerKnowledgeIndex.json";

const playerById = new Map(players.map((player) => [player.id, player]));
const playerByName = new Map(players.map((player) => [normalize(player.name), player]));

export function getKnowledgeGraphIndex() {
  return knowledgeIndex;
}

export function getPlayerByKnowledgeId(id) {
  return playerById.get(id) || null;
}

export function getPlayerByKnowledgeName(name) {
  return playerByName.get(normalize(name)) || null;
}

export function getPlayersBySemanticTag(tag) {
  const ids = knowledgeIndex.byTag?.[normalizeTag(tag)] || [];
  return ids.map((id) => playerById.get(id)).filter(Boolean);
}

export function getPlayersByKnowledgeFacet(facet, value) {
  const index = knowledgeIndex[facet];
  if (!index) return [];
  const ids = index[value] || index[normalizeTag(value)] || [];
  return ids.map((id) => playerById.get(id)).filter(Boolean);
}

export function searchKnowledgeGraph(query) {
  const needle = normalize(query);
  if (!needle) return players;

  return Object.entries(knowledgeIndex.search || {})
    .filter(([, text]) => normalize(text).includes(needle))
    .map(([id]) => playerById.get(id))
    .filter(Boolean);
}

export function getQuestionReadyTraits(player) {
  if (!player) return [];
  return [
    ...(player.tacticalTags || []),
    ...(player.dnaTags || []),
    ...(player.playerDNA?.historicalTags || []),
    ...(player.playerDNA?.pressureTraits || []),
    ...(player.semanticVector || []),
  ];
}

function normalize(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function normalizeTag(value) {
  return normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
