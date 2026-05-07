/**
 * build-hybrid-dataset.mjs
 * Builds the final players.json using the clean 182-player CSV as PRIMARY source,
 * enriched with historical IPL.csv match data and playerMetadata for bio fields.
 *
 * Priority order:
 *   1. Clean 182-player dataset (names, country, role, stats)
 *   2. playerMetadata.json (batting/bowling style, handedness, WK)
 *   3. Historical IPL.csv (team history, match-level traits)
 *   4. Inferred metadata (from stats analysis)
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const cleanCsvPath = path.join(rootDir, "IPL dataset final.csv");
const historicalCsvPath = path.join(rootDir, "IPL.csv");
const metadataPath = path.join(rootDir, "src", "data", "playerMetadata.json");
const aliasPath = path.join(rootDir, "src", "data", "playerAliases.json");
const overridesPath = path.join(rootDir, "src", "data", "currentPlayerOverrides.json");
const dataDir = path.join(rootDir, "src", "data");

// --- Country code to full name mapping ---
const countryMap = {
  IND: "India", AUS: "Australia", ENG: "England", SA: "South Africa",
  NZ: "New Zealand", WI: "West Indies", SL: "Sri Lanka",
  BAN: "Bangladesh", AFG: "Afghanistan",
};

// --- Team code to full name mapping ---
const teamCodeMap = {
  CSK: "Chennai Super Kings", DC: "Delhi Capitals", GT: "Gujarat Titans",
  KKR: "Kolkata Knight Riders", LSG: "Lucknow Super Giants",
  MI: "Mumbai Indians", PK: "Punjab Kings", RCB: "Royal Challengers Bengaluru",
  RR: "Rajasthan Royals", SRH: "Sunrisers Hyderabad",
};

// --- Historical team name normalization ---
const canonicalTeams = new Map([
  ["Royal Challengers Bangalore", "Royal Challengers Bengaluru"],
  ["Royal Challengers Bengaluru", "Royal Challengers Bengaluru"],
  ["Rising Pune Supergiants", "Rising Pune Supergiant"],
  ["Rising Pune Supergiant", "Rising Pune Supergiant"],
  ["Kings XI Punjab", "Punjab Kings"], ["Punjab Kings", "Punjab Kings"],
  ["Delhi Daredevils", "Delhi Capitals"], ["Delhi Capitals", "Delhi Capitals"],
  ["Deccan Chargers", "Deccan Chargers"],
  ["Sunrisers Hyderabad", "Sunrisers Hyderabad"],
  ["Kolkata Knight Riders", "Kolkata Knight Riders"],
  ["Chennai Super Kings", "Chennai Super Kings"],
  ["Mumbai Indians", "Mumbai Indians"],
  ["Rajasthan Royals", "Rajasthan Royals"],
  ["Kochi Tuskers Kerala", "Kochi Tuskers Kerala"],
  ["Pune Warriors", "Pune Warriors India"],
  ["Pune Warriors India", "Pune Warriors India"],
  ["Gujarat Lions", "Gujarat Lions"], ["Gujarat Titans", "Gujarat Titans"],
  ["Lucknow Super Giants", "Lucknow Super Giants"],
]);

// --- CSV parsing helper ---
function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && quoted && line[i + 1] === '"') { current += '"'; i++; }
    else if (char === '"') { quoted = !quoted; }
    else if (char === "," && !quoted) { values.push(current); current = ""; }
    else { current += char; }
  }
  values.push(current);
  return values;
}

// --- Slugify a name into a URL-friendly ID ---
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// --- Parse a number safely ---
function num(val) {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

// --- Determine batting position label from average position ---
function positionLabel(avgPos) {
  if (!avgPos || avgPos <= 2) return "opener";
  if (avgPos <= 5) return "top-middle";
  if (avgPos <= 7) return "middle-lower";
  return "tail";
}

// --- Normalize role from clean CSV format ---
function normalizeRole(csvRole) {
  const lower = (csvRole || "").toLowerCase().trim();
  if (lower === "batting") return "batsman";
  if (lower === "bowling") return "bowler";
  if (lower === "all rounder") return "all-rounder";
  return "unknown";
}

// --- Determine if a bowling style makes the player a spinner or pacer ---
function classifyBowler(bowlStyle) {
  if (!bowlStyle || bowlStyle === "none") return { spinner: false, pacer: false };
  const lower = bowlStyle.toLowerCase();
  const spinKeywords = ["orthodox", "off-break", "leg-break", "chinaman", "mystery"];
  const paceKeywords = ["fast", "medium-fast", "fast-medium"];
  const isSpin = spinKeywords.some((k) => lower.includes(k));
  const isPace = paceKeywords.some((k) => lower.includes(k));
  // "medium" alone (like Dwayne Bravo) counts as pace
  if (!isSpin && !isPace && lower.includes("medium")) return { spinner: false, pacer: true };
  return { spinner: isSpin, pacer: isPace };
}

// --- Check if a player is a mystery spinner ---
function isMystery(bowlStyle) {
  return (bowlStyle || "").toLowerCase().includes("mystery");
}

// --- STEP 1: Parse clean CSV ---
function parseCleanCsv() {
  const content = fs.readFileSync(cleanCsvPath, "utf8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  const header = parseCsvLine(lines[0]);
  const players = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols[0]) continue;
    const row = {};
    header.forEach((h, idx) => { row[h.trim()] = (cols[idx] || "").trim(); });

    players.push({
      name: row.Player,
      countryCode: row.COUNTRY,
      country: countryMap[row.COUNTRY] || row.COUNTRY,
      teamCode: row.TEAM,
      currentTeam: teamCodeMap[row.TEAM] || row.TEAM,
      age: num(row.AGE),
      captainExp: num(row["CAPTAINCY EXP"]),
      role: normalizeRole(row.Paying_Role),
      // Batting stats
      matches: num(row.Mat),
      innings: num(row.Inns),
      runs: num(row.Runs),
      ballsFaced: num(row.BF),
      highScore: num(row.HS),
      average: num(row.Avg),
      strikeRate: num(row.SR),
      notOuts: num(row.NO),
      fours: num(row["4s"]),
      sixes: num(row["6s"]),
      ducks: num(row["0s"]),
      fifties: num(row["50s"]),
      hundreds: num(row["100s"]),
      // Bowling stats
      bowlingInnings: num(row.B_Inns),
      ballsBowled: num(row.B_Balls),
      runsConceded: num(row.B_Runs),
      maidens: num(row.B_Maidens),
      wickets: num(row.B_Wkts),
      bowlingAvg: num(row.B_Avg),
      economy: num(row.B_Econ),
      bowlingSR: num(row.B_SR),
      fourWickets: num(row.B_4w),
      fiveWickets: num(row.B_5w),
    });
  }
  return players;
}

// --- STEP 2: Load metadata and aliases ---
function loadMetadata() {
  if (!fs.existsSync(metadataPath)) return {};
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

function loadAliases() {
  if (!fs.existsSync(aliasPath)) return {};
  return JSON.parse(fs.readFileSync(aliasPath, "utf8"));
}

function loadOverrides() {
  if (!fs.existsSync(overridesPath)) return {};
  return JSON.parse(fs.readFileSync(overridesPath, "utf8"));
}

// --- STEP 3: Enrich from historical IPL.csv (optional) ---
async function loadHistoricalData(aliases) {
  if (!fs.existsSync(historicalCsvPath)) {
    console.log("Historical IPL.csv not found — skipping enrichment.");
    return new Map();
  }

  // Build reverse alias map: full name → set of scorecard names
  const reverseAlias = new Map();
  for (const [abbr, full] of Object.entries(aliases)) {
    if (!reverseAlias.has(full)) reverseAlias.set(full, new Set());
    reverseAlias.get(full).add(abbr);
    reverseAlias.get(full).add(full); // also match by full name
  }

  const playerData = new Map(); // fullName → enrichment data
  const stream = fs.createReadStream(historicalCsvPath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  let header = [];
  let rowCount = 0;
  const matchWinners = new Map();
  const matchCaptains = new Map();
  const seasonBatting = new Map();
  const seasonBowling = new Map();
  const matchPomSeen = new Set();

  // Resolve a scorecard name to a full name
  function resolve(scorecardName) {
    if (!scorecardName) return null;
    const clean = scorecardName.replace(/\s+/g, " ").replace(/\s+\(sub\)$/i, "").trim();
    if (aliases[clean]) return aliases[clean];
    return null; // only match known aliases
  }

  function getEnrichment(fullName) {
    if (!fullName) return null;
    if (!playerData.has(fullName)) {
      playerData.set(fullName, {
        historicalTeams: new Set(),
        seasons: new Set(),
        matchIds: new Set(),
        titleWins: new Set(),
        titleWinningCaptain: false,
        playerOfMatch: 0,
        playoffRuns: 0,
        playoffWickets: 0,
        deathBalls: 0,
        deathWickets: 0,
        deathRunsConceded: 0,
        dotBalls: 0,
        battingPositions: new Map(),
        battingBallsByOver: { powerplay: 0, middle: 0, death: 0 },
        historicalBatterBalls: 0,
        historicalBallsBowled: 0,
      });
    }
    return playerData.get(fullName);
  }

  const finalStages = new Set(["Final", "Qualifier 1", "Qualifier 2", "Eliminator"]);
  const wicketKinds = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);

  for await (const line of rl) {
    if (!header.length) { header = parseCsvLine(line); continue; }
    if (!line.trim()) continue;
    rowCount++;
    const vals = parseCsvLine(line);
    const row = {};
    header.forEach((col, idx) => { row[col] = vals[idx] ?? ""; });

    const matchId = (row.match_id || "").trim();
    const season = num(row.year) || num((row.season || "").match(/\d{4}/)?.[0]);
    const battingTeam = canonicalTeams.get((row.batting_team || "").trim()) || (row.batting_team || "").trim();
    const bowlingTeam = canonicalTeams.get((row.bowling_team || "").trim()) || (row.bowling_team || "").trim();
    const winner = canonicalTeams.get((row.match_won_by || "").trim()) || (row.match_won_by || "").trim();
    const stage = (row.stage || "").trim();
    const validBall = num(row.valid_ball) === 1;
    const over = num(row.over);
    const runsBatter = num(row.runs_batter);
    const runsBowler = num(row.runs_bowler);
    const wicketKind = (row.wicket_kind || "").trim().toLowerCase();
    const pomRaw = (row.player_of_match || "").replace(/\s+/g, " ").trim();

    if (matchId && winner) matchWinners.set(matchId, winner);

    // Batter enrichment
    const batterFull = resolve((row.batter || "").trim());
    if (batterFull) {
      const e = getEnrichment(batterFull);
      e.historicalTeams.add(battingTeam);
      e.seasons.add(season);
      e.matchIds.add(matchId);
      if (validBall) {
        e.historicalBatterBalls++;
        const batPos = (row.bat_pos || "").trim();
        if (batPos) e.battingPositions.set(batPos, (e.battingPositions.get(batPos) || 0) + 1);
        if (over < 6) e.battingBallsByOver.powerplay++;
        else if (over >= 16) e.battingBallsByOver.death++;
        else e.battingBallsByOver.middle++;
      }
      if (finalStages.has(stage)) e.playoffRuns += runsBatter;
      if (stage === "Final" && winner === battingTeam && season) {
        e.titleWins.add(`${season}:${winner}`);
      }
    }

    // Bowler enrichment
    const bowlerFull = resolve((row.bowler || "").trim());
    if (bowlerFull) {
      const e = getEnrichment(bowlerFull);
      e.historicalTeams.add(bowlingTeam);
      e.seasons.add(season);
      e.matchIds.add(matchId);
      if (validBall) {
        e.historicalBallsBowled++;
        if (runsBowler === 0) e.dotBalls++;
        if (over >= 16) {
          e.deathBalls++;
          e.deathRunsConceded += runsBowler;
        }
      }
      if (wicketKinds.has(wicketKind)) {
        if (over >= 16) e.deathWickets++;
        if (finalStages.has(stage)) e.playoffWickets++;
      }
    }

    // Player of Match
    const pomFull = resolve(pomRaw);
    if (pomFull && matchId && !matchPomSeen.has(`${matchId}:${pomFull}`)) {
      const e = getEnrichment(pomFull);
      e.playerOfMatch++;
      matchPomSeen.add(`${matchId}:${pomFull}`);
    }
  }

  console.log(`Processed ${rowCount} historical rows.`);
  return playerData;
}

// --- STEP 4: Build final player profiles ---
function buildProfiles(cleanPlayers, metadata, historical, overrides) {
  const profiles = [];

  const byName = new Map(cleanPlayers.map((player) => [player.name, player]));
  for (const [name, override] of Object.entries(overrides)) {
    if (!byName.has(name)) {
      byName.set(name, {
        name,
        countryCode: override.country === "India" ? "IND" : "",
        country: override.country,
        teamCode: "",
        currentTeam: override.currentTeam,
        age: 0,
        captainExp: override.captain ? 1 : 0,
        role: override.role || "unknown",
        matches: 0,
        innings: 0,
        runs: 0,
        ballsFaced: 0,
        highScore: 0,
        average: 0,
        strikeRate: override.aggressive ? 145 : 0,
        notOuts: 0,
        fours: 0,
        sixes: 0,
        ducks: 0,
        fifties: 0,
        hundreds: 0,
        bowlingInnings: 0,
        ballsBowled: 0,
        runsConceded: 0,
        maidens: 0,
        wickets: 0,
        bowlingAvg: 0,
        economy: 0,
        bowlingSR: 0,
        fourWickets: 0,
        fiveWickets: 0,
      });
    }
  }

  for (const p of byName.values()) {
    const override = overrides[p.name] || {};
    const meta = metadata[p.name] || {};
    const hist = historical.get(p.name);
    const battingStyle = override.battingStyle || meta.bat || "Right";
    const bowlingStyle = override.bowlingStyle || meta.bowl || (p.role === "bowler" ? "Right-arm medium" : "none");
    const role = override.role || p.role;
    const bowlClass = classifyBowler(bowlingStyle);

    // Merge teams: current team + historical teams
    const currentTeam = override.currentTeam || p.currentTeam;
    const allTeams = new Set([currentTeam]);
    if (hist) hist.historicalTeams.forEach((t) => { if (t) allTeams.add(t); });
    if (override.teams) override.teams.forEach((t) => allTeams.add(t));
    if (override.historicalTeams) override.historicalTeams.forEach((t) => allTeams.add(t));

    // Determine batting position from historical data
    let primaryPos = 0;
    if (hist && hist.battingPositions.size > 0) {
      let bestCount = 0;
      for (const [pos, count] of hist.battingPositions) {
        if (count > bestCount) { bestCount = count; primaryPos = num(pos); }
      }
    }
    // Fallback: use role to guess position
    if (!primaryPos) {
      if (role === "batsman") primaryPos = p.runs > 2000 ? 2 : 4;
      else if (role === "bowler") primaryPos = 9;
      else primaryPos = 5;
    }

    // Determine key traits
    const sr = p.strikeRate || 0;
    const hasBatting = p.ballsFaced >= 75;
    const hasBowling = p.ballsBowled >= 75;
    const isOverseas = override.overseas ?? (p.countryCode !== "IND");
    const isCaptain = override.captain ?? (p.captainExp > 0);
    const seasons = hist ? [...hist.seasons].filter(Boolean) : [];
    const debutYear = seasons.length ? Math.min(...seasons) : 0;
    const latestYear = seasons.length ? Math.max(...seasons) : 0;
    const deathShare = hist && hist.historicalBallsBowled ? hist.deathBalls / hist.historicalBallsBowled : 0;
    const dotRate = hist && hist.historicalBallsBowled ? hist.dotBalls / hist.historicalBallsBowled : 0;

    // Determine opener/middle/finisher from batting position data
    let openerRate = 0, lowerRate = 0;
    if (hist && hist.battingPositions.size > 0) {
      const totalPosEntries = [...hist.battingPositions.values()].reduce((a, b) => a + b, 0);
      const openerEntries = (hist.battingPositions.get("1") || 0) + (hist.battingPositions.get("2") || 0);
      openerRate = totalPosEntries ? openerEntries / totalPosEntries : 0;
      const lowerEntries = [...hist.battingPositions.entries()]
        .filter(([pos]) => num(pos) >= 6)
        .reduce((sum, [, c]) => sum + c, 0);
      lowerRate = totalPosEntries ? lowerEntries / totalPosEntries : 0;
    }

    const profile = {
      id: slugify(p.name),
      name: p.name,
      country: override.country || p.country || "India",
      role,
      battingStyle,
      bowlingStyle,
      teams: [...allTeams].sort(),
      currentTeam,
      historicalTeams: [...new Set([...(hist ? [...hist.historicalTeams] : []), ...(override.historicalTeams || [])])]
        .filter(Boolean)
        .sort(),
      active: override.active ?? (latestYear >= 2024),
      retired: override.retired ?? (latestYear > 0 && latestYear < 2023),
      overseas: isOverseas,
      wicketKeeper: override.wicketKeeper ?? meta.wk ?? false,
      opener: override.opener ?? (openerRate >= 0.4 && hasBatting),
      middleOrder: override.middleOrder ?? (primaryPos >= 3 && primaryPos <= 6 && hasBatting),
      finisher: override.finisher ?? (hasBatting && (lowerRate >= 0.3 || primaryPos >= 5) && sr >= 130),
      powerHitter: override.powerHitter ?? (hasBatting && sr >= 140),
      anchorBatter: override.anchorBatter ?? (hasBatting && sr >= 105 && sr <= 135 && (openerRate >= 0.3 || primaryPos <= 4)),
      spinner: bowlClass.spinner,
      pacer: bowlClass.pacer,
      deathBowler: override.deathBowler ?? (hasBowling && deathShare >= 0.2),
      captain: isCaptain,
      titleWinningCaptain: override.titleWinningCaptain ?? (hist ? hist.titleWinningCaptain : false),
      orangeCap: override.orangeCap ?? false,
      purpleCap: override.purpleCap ?? false,
      leftHanded: override.leftHanded ?? meta.left ?? (battingStyle === "Left"),
      aggressive: override.aggressive ?? (hasBatting && sr >= 140),
      defensive: override.defensive ?? (hasBatting && sr < 115 && sr > 0),
      mysterySpinner: isMystery(meta.bowl),
      famousForYorkers: override.famousForYorkers ?? (hasBowling && deathShare >= 0.3 && dotRate >= 0.38),
      playoffsHero: override.playoffsHero ?? (hist ? hist.playoffRuns >= 100 || hist.playoffWickets >= 5 : false),
      fanFavorite: override.fanFavorite ?? (p.matches >= 50 || (hist ? hist.playerOfMatch >= 3 : false)),
      iconic: override.iconic ?? (p.matches >= 100 || p.runs >= 3000 || p.wickets >= 100 || (hist ? hist.playerOfMatch >= 5 : false)),
      battingPosition: override.battingPosition || positionLabel(primaryPos),
      debutYear: override.debutYear || debutYear,
      titlesWon: override.titlesWon ?? (hist ? hist.titleWins.size : 0),
      dataConfidence: {
        country: 1.0,
        battingStyle: override.battingStyle || meta.bat ? 1.0 : 0.7,
        bowlingStyle: override.bowlingStyle || meta.bowl ? 1.0 : 0.7,
        role: 1.0,
        name: 1.0,
      },
    };

    profiles.push(profile);
  }

  return profiles;
}

// --- STEP 5: Validation ---
function validateProfiles(profiles) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenNames = new Set();

  for (const p of profiles) {
    const label = p.id;

    // Check for abbreviated names (initials pattern)
    // Whitelist known correct short names
    const knownShortNames = new Set(["MS Dhoni", "K L Rahul", "AB de Villiers", "T Natarajan", "B Indrajith"]);
    if (/^[A-Z]{1,3}\s[A-Z]/.test(p.name) && p.name.split(" ")[0].length <= 3 && !knownShortNames.has(p.name)) {
      errors.push(`${label}: name "${p.name}" appears abbreviated`);
    }

    // Check for missing/unknown metadata
    if (p.country === "Unknown") warnings.push(`${label}: missing country`);
    if (p.battingStyle === "unknown") warnings.push(`${label}: missing batting style`);
    if (p.bowlingStyle === "unknown") warnings.push(`${label}: missing bowling style`);

    // Check for duplicates
    if (seenIds.has(p.id)) errors.push(`${label}: duplicate id`);
    if (seenNames.has(p.name)) errors.push(`${label}: duplicate name`);
    seenIds.add(p.id);
    seenNames.add(p.name);

    // Check impossible combos
    if (p.role === "bowler" && p.powerHitter && p.anchorBatter) {
      warnings.push(`${label}: bowler with conflicting batting traits`);
    }
    if (p.role === "batsman" && p.spinner && p.pacer) {
      warnings.push(`${label}: batsman marked as both spinner and pacer`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// --- Main execution ---
async function main() {
  console.log("=== IPLMind Hybrid Dataset Builder ===\n");

  // Step 1: Parse clean CSV
  console.log("Step 1: Parsing clean 182-player dataset...");
  const cleanPlayers = parseCleanCsv();
  console.log(`  Found ${cleanPlayers.length} players.\n`);

  // Step 2: Load metadata
  console.log("Step 2: Loading player metadata...");
  const metadata = loadMetadata();
  console.log(`  Loaded metadata for ${Object.keys(metadata).length} players.\n`);
  const overrides = loadOverrides();
  console.log(`  Loaded ${Object.keys(overrides).length} current-player overrides.\n`);

  // Step 3: Load aliases and historical data
  console.log("Step 3: Loading aliases and historical data...");
  const aliases = loadAliases();
  console.log(`  Loaded ${Object.keys(aliases).length} aliases.`);
  const historical = await loadHistoricalData(aliases);
  console.log(`  Historical data for ${historical.size} matched players.\n`);

  // Step 4: Build profiles
  console.log("Step 4: Building player profiles...");
  const profiles = buildProfiles(cleanPlayers, metadata, historical, overrides);
  console.log(`  Built ${profiles.length} profiles.\n`);

  // Step 5: Validate
  console.log("Step 5: Validating profiles...");
  const validation = validateProfiles(profiles);
  if (validation.errors.length) {
    console.log(`  ERRORS (${validation.errors.length}):`);
    validation.errors.forEach((e) => console.log(`    ✗ ${e}`));
  }
  if (validation.warnings.length) {
    console.log(`  WARNINGS (${validation.warnings.length}):`);
    validation.warnings.slice(0, 10).forEach((w) => console.log(`    ⚠ ${w}`));
    if (validation.warnings.length > 10) console.log(`    ... and ${validation.warnings.length - 10} more`);
  }
  if (validation.valid) console.log("  ✓ All profiles valid!");

  // Step 6: Write output
  console.log("\nStep 6: Writing output files...");
  fs.mkdirSync(dataDir, { recursive: true });

  // Remove dataConfidence from the public profiles (keep separate)
  const publicProfiles = profiles.map(({ dataConfidence, ...rest }) => rest);
  const confidenceMap = Object.fromEntries(profiles.map((p) => [p.id, p.dataConfidence]));

  fs.writeFileSync(path.join(dataDir, "players.json"), JSON.stringify(publicProfiles, null, 2) + "\n");
  fs.writeFileSync(path.join(dataDir, "data-confidence.json"), JSON.stringify(confidenceMap, null, 2) + "\n");

  // Write build report
  const report = {
    source: "IPL dataset final.csv (primary) + IPL.csv (enrichment)",
    generatedAt: new Date().toISOString(),
    playerCount: publicProfiles.length,
    countriesRepresented: [...new Set(publicProfiles.map((p) => p.country))].sort(),
    teamsRepresented: [...new Set(publicProfiles.flatMap((p) => p.teams))].sort(),
    rolesBreakdown: {
      batsman: publicProfiles.filter((p) => p.role === "batsman").length,
      bowler: publicProfiles.filter((p) => p.role === "bowler").length,
      "all-rounder": publicProfiles.filter((p) => p.role === "all-rounder").length,
    },
    metadataCoverage: {
      withCountry: publicProfiles.filter((p) => p.country !== "Unknown").length,
      withBattingStyle: publicProfiles.filter((p) => p.battingStyle !== "unknown").length,
      withBowlingStyle: publicProfiles.filter((p) => p.bowlingStyle !== "unknown" && p.bowlingStyle !== "none").length,
      withWicketKeeper: publicProfiles.filter((p) => p.wicketKeeper).length,
    },
    validation,
  };
  fs.writeFileSync(path.join(dataDir, "dataset-report.json"), JSON.stringify(report, null, 2) + "\n");

  console.log(`\n✅ Done! Generated ${publicProfiles.length} player profiles.`);
  console.log(`   Countries: ${report.countriesRepresented.length}`);
  console.log(`   Teams: ${report.teamsRepresented.length}`);
  console.log(`   Metadata coverage: ${report.metadataCoverage.withBattingStyle}/${publicProfiles.length} batting styles`);
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
