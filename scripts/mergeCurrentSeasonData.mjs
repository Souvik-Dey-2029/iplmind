/**
 * IPL 2026 Season Data Merge Pipeline
 * Merges new season data into existing players.json without destroying history.
 * 
 * Usage: node scripts/mergeCurrentSeasonData.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PLAYERS_PATH = join(__dirname, '..', 'src', 'data', 'players.json');
const SQUAD_PATH = join(__dirname, 'ipl2026squads.json');
const ALIASES_PATH = join(__dirname, '..', 'src', 'data', 'playerAliases.json');

// Franchise name normalization map
const TEAM_NORMALIZE = {
  'CSK': 'Chennai Super Kings', 'MI': 'Mumbai Indians', 'RCB': 'Royal Challengers Bengaluru',
  'KKR': 'Kolkata Knight Riders', 'DC': 'Delhi Capitals', 'SRH': 'Sunrisers Hyderabad',
  'RR': 'Rajasthan Royals', 'GT': 'Gujarat Titans', 'LSG': 'Lucknow Super Giants',
  'PBKS': 'Punjab Kings', 'PK': 'Punjab Kings',
};

// Country code normalization
const COUNTRY_NORMALIZE = {
  'IND': 'India', 'AUS': 'Australia', 'ENG': 'England', 'NZ': 'New Zealand',
  'SA': 'South Africa', 'WI': 'West Indies', 'SL': 'Sri Lanka', 'AFG': 'Afghanistan',
  'BAN': 'Bangladesh', 'ZIM': 'Zimbabwe', 'IRE': 'Ireland', 'NEP': 'Nepal', 'SCO': 'Scotland',
};

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function normalizeCountry(code) {
  return COUNTRY_NORMALIZE[code] || code;
}

function normalizeTeam(team) {
  return TEAM_NORMALIZE[team] || team;
}

/** Build a lookup index from existing players by lowercase name */
function buildNameIndex(players) {
  const idx = new Map();
  players.forEach((p, i) => idx.set(p.name.toLowerCase(), i));
  return idx;
}

/** Merge a single new player into the existing dataset */
function mergePlayer(existing, update) {
  // Preserve all historical teams
  const allTeams = new Set([
    ...(existing.teams || []).map(normalizeTeam),
    ...(existing.historicalTeams || []).map(normalizeTeam),
  ]);
  
  const newCurrentTeam = normalizeTeam(update.currentTeam);
  allTeams.add(newCurrentTeam);

  // Historical = all teams except current
  const historicalTeams = [...allTeams].filter(t => t !== newCurrentTeam);

  return {
    ...existing,
    // Update current team
    currentTeam: newCurrentTeam,
    historicalTeams,
    teams: [...allTeams],
    // Update active/retired status
    active: update.active !== undefined ? update.active : existing.active,
    retired: update.retired !== undefined ? update.retired : existing.retired,
    // Update role if provided
    role: update.role || existing.role,
    // Update country normalization
    country: normalizeCountry(update.country || existing.country),
    // Update metadata flags if provided
    ...(update.captain !== undefined && { captain: update.captain }),
    ...(update.overseas !== undefined && { overseas: update.overseas }),
    ...(update.wicketKeeper !== undefined && { wicketKeeper: update.wicketKeeper }),
    ...(update.opener !== undefined && { opener: update.opener }),
    ...(update.spinner !== undefined && { spinner: update.spinner }),
    ...(update.pacer !== undefined && { pacer: update.pacer }),
    ...(update.leftHanded !== undefined && { leftHanded: update.leftHanded }),
    ...(update.debutYear !== undefined && update.debutYear > 0 && { debutYear: update.debutYear }),
  };
}

/** Create a brand new player entry from squad data */
function createNewPlayer(data) {
  return {
    id: slugify(data.name),
    name: data.name,
    country: normalizeCountry(data.country || 'IND'),
    role: data.role || 'batsman',
    battingStyle: data.battingStyle || 'Right',
    bowlingStyle: data.bowlingStyle || 'none',
    teams: [normalizeTeam(data.currentTeam)],
    currentTeam: normalizeTeam(data.currentTeam),
    historicalTeams: [],
    active: true,
    retired: false,
    overseas: data.overseas || false,
    wicketKeeper: data.wicketKeeper || false,
    opener: data.opener || false,
    middleOrder: data.middleOrder || false,
    finisher: data.finisher || false,
    powerHitter: data.powerHitter || false,
    anchorBatter: data.anchorBatter || false,
    spinner: data.spinner || false,
    pacer: data.pacer || false,
    deathBowler: data.deathBowler || false,
    captain: data.captain || false,
    titleWinningCaptain: false,
    orangeCap: false,
    purpleCap: false,
    leftHanded: data.leftHanded || false,
    aggressive: data.aggressive || false,
    defensive: false,
    mysterySpinner: data.mysterySpinner || false,
    famousForYorkers: false,
    playoffsHero: false,
    fanFavorite: data.fanFavorite || false,
    iconic: data.iconic || false,
    battingPosition: data.battingPosition || 'middle',
    debutYear: data.debutYear || 2026,
    titlesWon: data.titlesWon || 0,
    dataConfidence: { country: 0.95, role: 0.9, name: 1 },
  };
}

/** Run the merge pipeline */
function run() {
  const existingPlayers = JSON.parse(readFileSync(PLAYERS_PATH, 'utf-8'));
  
  let squadData;
  try {
    squadData = JSON.parse(readFileSync(SQUAD_PATH, 'utf-8'));
  } catch (e) {
    console.error('Could not read ipl2026squads.json. Create it first.');
    process.exit(1);
  }

  const nameIndex = buildNameIndex(existingPlayers);
  let merged = 0, added = 0, skipped = 0;

  for (const player of squadData) {
    const key = player.name.toLowerCase();
    const idx = nameIndex.get(key);

    if (idx !== undefined) {
      existingPlayers[idx] = mergePlayer(existingPlayers[idx], player);
      merged++;
    } else {
      existingPlayers.push(createNewPlayer(player));
      added++;
    }
  }

  // Normalize ALL countries in the dataset
  existingPlayers.forEach(p => {
    p.country = normalizeCountry(p.country);
    p.currentTeam = normalizeTeam(p.currentTeam);
    p.teams = (p.teams || []).map(normalizeTeam);
    p.historicalTeams = (p.historicalTeams || []).map(normalizeTeam);
  });

  // Write back
  writeFileSync(PLAYERS_PATH, JSON.stringify(existingPlayers, null, 2), 'utf-8');

  console.log(`\n=== IPL 2026 Merge Complete ===`);
  console.log(`  Merged (updated): ${merged}`);
  console.log(`  Added (new):      ${added}`);
  console.log(`  Total players:    ${existingPlayers.length}`);
}

run();
