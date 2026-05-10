/**
 * Player DNA Enrichment Script
 * 
 * Reads the existing players.json, enriches every player with:
 * - dnaTags (semantic personality/playstyle tags)
 * - era classification 
 * - rarity level
 * - archetype
 * - iconicMoments
 * - popularity score
 * 
 * Uses deterministic rules for known players, then Gemini for unknowns.
 * 
 * Run: node scripts/enrichPlayers.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = path.join(__dirname, "..", "src", "data", "players.json");

// ═══ ERA CLASSIFICATION ═══
function classifyEra(debutYear, active, retired) {
  if (!debutYear || debutYear === 0) {
    return active ? "modern-era" : "unknown-era";
  }
  if (debutYear <= 2010) return "founding-era";      // 2008-2010
  if (debutYear <= 2013) return "golden-era";         // 2011-2013
  if (debutYear <= 2017) return "expansion-era";      // 2014-2017
  if (debutYear <= 2021) return "mega-auction-era";   // 2018-2021
  return "modern-era";                                // 2022+
}

// ═══ RARITY CLASSIFICATION ═══
function classifyRarity(player) {
  const { iconic, fanFavorite, captain, titleWinningCaptain, orangeCap, purpleCap, active, retired, debutYear } = player;
  
  // Common: Well-known active stars
  if (iconic && fanFavorite) return "common";
  if (titleWinningCaptain) return "common";
  if (orangeCap && purpleCap) return "common";
  
  // Rare: Solid players, somewhat recognizable
  if (captain || orangeCap || purpleCap || fanFavorite) return "rare";
  if (iconic) return "rare";
  
  // Epic: Less known but not obscure  
  if (active && debutYear && debutYear > 2020) return "rare";
  if (active) return "epic";
  
  // Legendary (hardest): Retired, obscure, short careers
  if (retired) return "legendary";
  if (!active && debutYear && debutYear < 2015) return "legendary";
  if (!active) return "epic";
  
  return "epic";
}

// ═══ ARCHETYPE CLASSIFICATION ═══
function classifyArchetype(player) {
  const { role, opener, finisher, powerHitter, anchorBatter, spinner, pacer, deathBowler, wicketKeeper, captain, mysterySpinner, famousForYorkers } = player;
  
  if (wicketKeeper && captain) return "keeper-captain";
  if (wicketKeeper && finisher) return "keeper-finisher";
  if (wicketKeeper) return "gloveman";
  
  if (role === "batsman") {
    if (opener && powerHitter) return "aggressive-opener";
    if (opener && anchorBatter) return "anchor-opener";
    if (opener) return "top-order-bat";
    if (finisher && powerHitter) return "explosive-finisher";
    if (finisher) return "clutch-finisher";
    if (powerHitter) return "power-hitter";
    if (anchorBatter) return "sheet-anchor";
    return "middle-order-bat";
  }
  
  if (role === "bowler") {
    if (mysterySpinner) return "mystery-spinner";
    if (spinner && captain) return "spin-allrounder";
    if (spinner) return "classical-spinner";
    if (famousForYorkers) return "yorker-specialist";
    if (deathBowler && pacer) return "death-overs-pacer";
    if (pacer) return "pace-spearhead";
    return "support-bowler";
  }
  
  if (role === "all-rounder" || role === "allrounder") {
    if (powerHitter && pacer) return "pace-allrounder";
    if (powerHitter && spinner) return "spin-allrounder";
    if (finisher) return "allrounder-finisher";
    return "batting-allrounder";
  }
  
  return "utility-player";
}

// ═══ POPULARITY SCORE (0-100) ═══
function calculatePopularity(player) {
  let score = 20; // base
  if (player.iconic) score += 30;
  if (player.fanFavorite) score += 20;
  if (player.captain) score += 10;
  if (player.titleWinningCaptain) score += 15;
  if (player.orangeCap) score += 10;
  if (player.purpleCap) score += 10;
  if (player.active) score += 5;
  if (player.playoffsHero) score += 5;
  if (player.titlesWon > 0) score += player.titlesWon * 3;
  return Math.min(score, 100);
}

// ═══ DNA TAGS GENERATOR ═══
function generateDNATags(player) {
  const tags = [];
  
  // Role-based
  if (player.opener) tags.push("opener");
  if (player.finisher) tags.push("finisher");
  if (player.powerHitter) tags.push("power-hitter");
  if (player.anchorBatter) tags.push("anchor");
  if (player.wicketKeeper) tags.push("wicketkeeper");
  if (player.captain) tags.push("captain");
  if (player.titleWinningCaptain) tags.push("title-winning-captain");
  if (player.spinner) tags.push("spinner");
  if (player.pacer) tags.push("pacer");
  if (player.deathBowler) tags.push("death-bowler");
  if (player.mysterySpinner) tags.push("mystery-spinner");
  if (player.famousForYorkers) tags.push("yorker-specialist");
  if (player.leftHanded) tags.push("left-hander");
  if (player.aggressive) tags.push("aggressive");
  if (player.defensive) tags.push("defensive");
  if (player.iconic) tags.push("iconic");
  if (player.fanFavorite) tags.push("fan-favorite");
  if (player.playoffsHero) tags.push("playoffs-hero");
  if (player.orangeCap) tags.push("orange-cap-winner");
  if (player.purpleCap) tags.push("purple-cap-winner");
  
  // Era-based
  if (player.debutYear && player.debutYear <= 2010 && !player.active) tags.push("IPL-veteran");
  if (player.retired) tags.push("retired-legend");
  if (!player.active && player.debutYear && player.debutYear < 2015) tags.push("early-era-player");
  
  // Overseas
  if (player.overseas) tags.push("overseas");
  else tags.push("domestic");
  
  // Team loyalty
  if (player.teams && player.teams.length === 1 && player.active) tags.push("one-team-loyalist");
  if (player.teams && player.teams.length >= 4) tags.push("journeyman");
  
  // Titles
  if (player.titlesWon >= 3) tags.push("serial-winner");
  else if (player.titlesWon >= 1) tags.push("title-winner");
  
  return tags;
}

// ═══ WELL-KNOWN PLAYER OVERRIDES ═══
const KNOWN_PLAYER_DNA = {
  "MS Dhoni": {
    dnaTags: ["captain-cool", "finisher", "helicopter-shot", "CSK-legend", "clutch-player", "calm-under-pressure", "death-over-specialist", "tactical-genius", "wicketkeeper", "title-winning-captain", "IPL-icon", "veteran-legend"],
    iconicMoments: ["2010-final-finish", "2011-WC-six", "CSK-5-titles", "2023-comeback"],
    popularityScore: 100,
    rarity: "common",
  },
  "Virat Kohli": {
    dnaTags: ["run-machine", "chase-master", "aggressive", "RCB-legend", "passionate", "anchor", "orange-cap-winner", "consistency-king", "IPL-icon", "all-format-legend"],
    iconicMoments: ["2016-run-fest-973", "RCB-loyalty", "4-orange-caps"],
    popularityScore: 100,
    rarity: "common",
  },
  "Rohit Sharma": {
    dnaTags: ["hitman", "MI-legend", "title-winning-captain", "elegant-opener", "pull-shot-king", "big-match-player", "5-IPL-titles", "IPL-icon"],
    iconicMoments: ["MI-5-titles-captain", "2015-century", "most-sixes"],
    popularityScore: 98,
    rarity: "common",
  },
  "Jasprit Bumrah": {
    dnaTags: ["yorker-king", "death-overs-specialist", "MI-spearhead", "unique-action", "pace-ace", "clutch-bowler", "match-winner"],
    iconicMoments: ["death-over-mastery", "2019-MI-final"],
    popularityScore: 92,
    rarity: "common",
  },
  "AB de Villiers": {
    dnaTags: ["Mr-360", "innovative", "RCB-legend", "match-winner", "destructive-batter", "overseas-icon", "clutch-player", "entertainer"],
    iconicMoments: ["360-degree-shots", "RCB-partnership-Kohli", "fastest-IPL-50"],
    popularityScore: 95,
    rarity: "common",
  },
  "Suresh Raina": {
    dnaTags: ["Mr-IPL", "CSK-legend", "left-hander", "clutch-fielder", "consistent-run-scorer", "first-IPL-century", "IPL-veteran"],
    iconicMoments: ["first-IPL-century", "CSK-Mr-Consistent", "5000-IPL-runs"],
    popularityScore: 88,
    rarity: "rare",
  },
  "Chris Gayle": {
    dnaTags: ["universe-boss", "explosive-opener", "six-hitter", "powerplay-destroyer", "entertainer", "IPL-icon", "T20-legend", "swagger"],
    iconicMoments: ["175-not-out-vs-PWI", "most-IPL-sixes", "RCB-PBKS-icon"],
    popularityScore: 95,
    rarity: "common",
  },
  "Lasith Malinga": {
    dnaTags: ["yorker-king", "slinga", "MI-legend", "death-overs-master", "unique-action", "IPL-veteran", "most-IPL-wickets-era"],
    iconicMoments: ["MI-finals-defense", "4-balls-4-wickets", "death-over-dominance"],
    popularityScore: 85,
    rarity: "rare",
  },
  "Shane Watson": {
    dnaTags: ["batting-allrounder", "explosive-opener", "CSK-hero", "big-match-player", "pace-bowling-allrounder", "versatile"],
    iconicMoments: ["2018-IPL-final-century", "RR-original-champion"],
    popularityScore: 78,
    rarity: "rare",
  },
  "Rashid Khan": {
    dnaTags: ["mystery-spinner", "leg-spin-wizard", "GT-star", "Afghan-sensation", "economy-king", "match-winner", "overseas-spinner"],
    iconicMoments: ["SRH-dominance", "GT-2022-title", "youngest-IPL-star"],
    popularityScore: 85,
    rarity: "common",
  },
  "Andre Russell": {
    dnaTags: ["muscle-russell", "power-hitter", "KKR-icon", "finisher", "six-machine", "all-rounder", "destructive", "pace-bowling-allrounder"],
    iconicMoments: ["KKR-impossible-chases", "2019-MVP", "six-hitting-records"],
    popularityScore: 88,
    rarity: "common",
  },
  "Sunil Narine": {
    dnaTags: ["mystery-spinner", "KKR-legend", "pinch-hitter", "dual-threat", "carrom-ball", "overseas-icon", "reinvented-opener"],
    iconicMoments: ["mystery-bowling-debut", "2024-opener-transformation", "KKR-loyalty"],
    popularityScore: 80,
    rarity: "rare",
  },
  "Ravindra Jadeja": {
    dnaTags: ["sir-jadeja", "CSK-allrounder", "sword-celebration", "fielding-genius", "spin-allrounder", "left-arm-spin", "lower-order-hitter"],
    iconicMoments: ["sword-celebration", "CSK-allround-dominance", "best-fielder"],
    popularityScore: 82,
    rarity: "common",
  },
  "David Warner": {
    dnaTags: ["aggressive-opener", "SRH-legend", "orange-cap-king", "explosive", "overseas-run-machine", "left-hander", "consistent"],
    iconicMoments: ["SRH-2016-title", "3-orange-caps", "DC-comeback"],
    popularityScore: 85,
    rarity: "common",
  },
  "KL Rahul": {
    dnaTags: ["elegant-batter", "keeper-batter", "orange-cap-winner", "PBKS-captain", "LSG-captain", "versatile-opener", "classical-shots"],
    iconicMoments: ["PBKS-captaincy", "fastest-IPL-50", "multi-team-star"],
    popularityScore: 80,
    rarity: "common",
  },
  "Hardik Pandya": {
    dnaTags: ["pace-allrounder", "MI-star", "GT-captain", "power-hitter", "match-winner", "finisher", "pace-bowling-allrounder"],
    iconicMoments: ["GT-2022-title-captain", "MI-return-2024", "India-WC-hero"],
    popularityScore: 85,
    rarity: "common",
  },
};

// ═══ MAIN ENRICHMENT ═══
function enrichPlayer(player) {
  const override = KNOWN_PLAYER_DNA[player.name];
  
  const era = classifyEra(player.debutYear, player.active, player.retired);
  const archetype = classifyArchetype(player);
  const autoTags = generateDNATags(player);
  const autoPopularity = calculatePopularity(player);
  const autoRarity = classifyRarity(player);
  
  return {
    ...player,
    // New fields
    era: override?.era || era,
    archetype: override?.archetype || archetype,
    dnaTags: override?.dnaTags || autoTags,
    iconicMoments: override?.iconicMoments || [],
    popularityScore: override?.popularityScore || autoPopularity,
    rarity: override?.rarity || autoRarity,
    // Fix missing debut years
    debutYear: player.debutYear || 0,
  };
}

// ═══ RUN ═══
const raw = JSON.parse(fs.readFileSync(PLAYERS_PATH, "utf-8"));
console.log(`Enriching ${raw.length} players...`);

const enriched = raw.map(enrichPlayer);

// Stats
const rarityCount = { common: 0, rare: 0, epic: 0, legendary: 0 };
const eraCount = {};
enriched.forEach(p => {
  rarityCount[p.rarity] = (rarityCount[p.rarity] || 0) + 1;
  eraCount[p.era] = (eraCount[p.era] || 0) + 1;
});

console.log("\n═══ ENRICHMENT RESULTS ═══");
console.log(`Total players: ${enriched.length}`);
console.log(`\nRarity distribution:`, rarityCount);
console.log(`Era distribution:`, eraCount);
console.log(`\nSample enriched player (Dhoni):`, JSON.stringify(enriched.find(p => p.name === "MS Dhoni"), null, 2));

// Write back
fs.writeFileSync(PLAYERS_PATH, JSON.stringify(enriched, null, 2));
console.log(`\n✅ Wrote enriched data to ${PLAYERS_PATH}`);
