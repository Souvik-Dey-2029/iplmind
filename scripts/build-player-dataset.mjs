import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const inputPath = path.join(rootDir, "IPL.csv");
const dataDir = path.join(rootDir, "src", "data");

const canonicalTeams = new Map([
  ["Royal Challengers Bangalore", "Royal Challengers Bengaluru"],
  ["Royal Challengers Bengaluru", "Royal Challengers Bengaluru"],
  ["Rising Pune Supergiants", "Rising Pune Supergiant"],
  ["Rising Pune Supergiant", "Rising Pune Supergiant"],
  ["Kings XI Punjab", "Punjab Kings"],
  ["Punjab Kings", "Punjab Kings"],
  ["Delhi Daredevils", "Delhi Capitals"],
  ["Delhi Capitals", "Delhi Capitals"],
  ["Deccan Chargers", "Deccan Chargers"],
  ["Sunrisers Hyderabad", "Sunrisers Hyderabad"],
  ["Kolkata Knight Riders", "Kolkata Knight Riders"],
  ["Chennai Super Kings", "Chennai Super Kings"],
  ["Mumbai Indians", "Mumbai Indians"],
  ["Rajasthan Royals", "Rajasthan Royals"],
  ["Kochi Tuskers Kerala", "Kochi Tuskers Kerala"],
  ["Pune Warriors", "Pune Warriors India"],
  ["Pune Warriors India", "Pune Warriors India"],
  ["Gujarat Lions", "Gujarat Lions"],
  ["Gujarat Titans", "Gujarat Titans"],
  ["Lucknow Super Giants", "Lucknow Super Giants"],
]);

const finalStages = new Set(["Final", "Qualifier 1", "Qualifier 2", "Eliminator", "Semi Final", "Semi-Final"]);
const wicketKindsForBowler = new Set(["bowled", "caught", "caught and bowled", "lbw", "stumped", "hit wicket"]);

const requiredFields = [
  "id",
  "name",
  "country",
  "role",
  "battingStyle",
  "bowlingStyle",
  "teams",
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
  "battingPosition",
  "debutYear",
  "titlesWon",
];

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

function cleanName(value) {
  return normalizeText(value)
    .replace(/\s+/g, " ")
    .replace(/\s+\(sub\)$/i, "")
    .trim();
}

function normalizeText(value) {
  if (value === undefined || value === null) return "";
  const text = String(value).trim();
  if (!text || text === "NA" || text === "Unknown") return "";
  return text;
}

function normalizeTeam(value) {
  const team = normalizeText(value);
  return canonicalTeams.get(team) || team;
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function seasonYear(value, year) {
  const explicitYear = number(year);
  if (explicitYear) return explicitYear;
  const season = normalizeText(value);
  const match = season.match(/\d{4}/);
  return match ? Number(match[0]) : 0;
}

function getPlayer(map, name) {
  if (!name) return null;
  if (!map.has(name)) {
    map.set(name, {
      name,
      teams: new Set(),
      seasons: new Set(),
      matches: new Set(),
      battingInnings: new Set(),
      battingPositions: new Map(),
      batterRuns: 0,
      batterBalls: 0,
      battingBallsByOver: {
        powerplay: 0,
        middle: 0,
        death: 0,
      },
      deathRuns: 0,
      fours: 0,
      sixes: 0,
      dismissals: 0,
      bowlingInnings: new Set(),
      ballsBowled: 0,
      runsConceded: 0,
      wickets: 0,
      dotBalls: 0,
      deathBalls: 0,
      deathWickets: 0,
      deathRunsConceded: 0,
      playerOfMatch: 0,
      playoffRuns: 0,
      playoffWickets: 0,
      finalRuns: 0,
      finalWickets: 0,
      wins: 0,
      titleWins: new Set(),
      titleWinningCaptain: false,
    });
  }
  return map.get(name);
}

function increment(map, key, amount = 1) {
  map.set(key, (map.get(key) || 0) + amount);
}

function mode(map) {
  let bestKey = "";
  let bestValue = -1;
  for (const [key, value] of map.entries()) {
    if (value > bestValue) {
      bestKey = key;
      bestValue = value;
    }
  }
  return bestKey;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[index];
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function battingPositionLabel(position) {
  if (!position) return "";
  if (position <= 2) return "opener";
  if (position <= 5) return "top-middle";
  if (position <= 7) return "middle-lower";
  return "tail";
}

function deriveRole(stats) {
  const battingWeight = stats.batterBalls + stats.batterRuns;
  const bowlingWeight = stats.ballsBowled * 1.35 + stats.wickets * 18;
  const meaningfulBatting = stats.batterBalls >= 250 || stats.batterRuns >= 300;
  const meaningfulBowling = stats.ballsBowled >= 500 || stats.wickets >= 20;

  if (meaningfulBatting && meaningfulBowling) return "all-rounder";
  if (bowlingWeight > battingWeight * 0.8 && stats.ballsBowled >= 120) return "bowler";
  if (stats.batterBalls >= 50 || stats.batterRuns > 0) return "batsman";
  return "unknown";
}

function buildProfile(stats, thresholds, maxYear) {
  const innings = Math.max(stats.battingInnings.size, 1);
  const strikeRate = stats.batterBalls ? (stats.batterRuns / stats.batterBalls) * 100 : 0;
  const boundaryRate = stats.batterBalls ? ((stats.fours + stats.sixes) / stats.batterBalls) * 100 : 0;
  const sixRate = stats.batterBalls ? (stats.sixes / stats.batterBalls) * 100 : 0;
  const deathShare = stats.batterBalls ? stats.battingBallsByOver.death / stats.batterBalls : 0;
  const dotRate = stats.ballsBowled ? stats.dotBalls / stats.ballsBowled : 0;
  const bowlingDeathShare = stats.ballsBowled ? stats.deathBalls / stats.ballsBowled : 0;
  const wicketsPerBall = stats.ballsBowled ? stats.wickets / stats.ballsBowled : 0;
  const primaryPosition = number(mode(stats.battingPositions));
  const openerRate =
    ((stats.battingPositions.get("1") || 0) + (stats.battingPositions.get("2") || 0)) / innings;
  const middleRate =
    [...stats.battingPositions.entries()]
      .filter(([pos]) => number(pos) >= 3 && number(pos) <= 6)
      .reduce((sum, [, count]) => sum + count, 0) / innings;
  const lowerRate =
    [...stats.battingPositions.entries()]
      .filter(([pos]) => number(pos) >= 6)
      .reduce((sum, [, count]) => sum + count, 0) / innings;
  const seasons = [...stats.seasons].filter(Boolean);
  const debutYear = seasons.length ? Math.min(...seasons) : 0;
  const latestYear = seasons.length ? Math.max(...seasons) : 0;
  const role = deriveRole(stats);
  const enoughBatting = stats.batterBalls >= 75;
  const enoughBowling = stats.ballsBowled >= 75;

  return {
    id: slugify(stats.name),
    name: stats.name,
    country: "Unknown",
    role,
    battingStyle: "unknown",
    bowlingStyle: stats.ballsBowled ? "unknown" : "none",
    teams: [...stats.teams].sort(),
    active: latestYear >= maxYear - 1,
    retired: latestYear > 0 && latestYear < maxYear - 1,
    overseas: false,
    wicketKeeper: false,
    opener: openerRate >= 0.42 && stats.batterBalls >= 60,
    middleOrder: middleRate >= 0.45 && stats.batterBalls >= 60,
    finisher:
      enoughBatting &&
      (deathShare >= 0.18 || lowerRate >= 0.35) &&
      (strikeRate >= Math.max(125, thresholds.strikeRate70) || sixRate >= thresholds.sixRate70),
    powerHitter:
      enoughBatting &&
      (strikeRate >= Math.max(135, thresholds.strikeRate75) ||
        boundaryRate >= thresholds.boundaryRate75 ||
        sixRate >= thresholds.sixRate80),
    anchorBatter:
      enoughBatting &&
      strikeRate >= 105 &&
      strikeRate <= Math.max(135, thresholds.strikeRate65) &&
      stats.batterBalls / innings >= 16 &&
      openerRate + middleRate >= 0.7,
    spinner: false,
    pacer: false,
    deathBowler:
      enoughBowling &&
      bowlingDeathShare >= 0.22 &&
      (dotRate >= thresholds.dotRate60 || stats.deathWickets >= thresholds.deathWickets60),
    captain: false,
    titleWinningCaptain: stats.titleWinningCaptain,
    orangeCap: false,
    purpleCap: false,
    leftHanded: false,
    aggressive: enoughBatting && strikeRate >= Math.max(135, thresholds.strikeRate75),
    defensive: enoughBatting && strikeRate < 110 && boundaryRate < thresholds.boundaryRate40,
    mysterySpinner: false,
    famousForYorkers: enoughBowling && bowlingDeathShare >= 0.32 && dotRate >= thresholds.dotRate70,
    playoffsHero:
      stats.playoffRuns >= thresholds.playoffRuns80 || stats.playoffWickets >= thresholds.playoffWickets80,
    fanFavorite:
      stats.playerOfMatch >= thresholds.playerOfMatch85 ||
      stats.matches.size >= thresholds.matches85 ||
      stats.batterRuns >= thresholds.runs90 ||
      stats.wickets >= thresholds.wickets90,
    iconic:
      stats.playerOfMatch >= thresholds.playerOfMatch90 ||
      stats.matches.size >= thresholds.matches90 ||
      stats.batterRuns >= thresholds.runs95 ||
      stats.wickets >= thresholds.wickets95 ||
      stats.titleWins.size >= 3,
    battingPosition: battingPositionLabel(primaryPosition),
    debutYear,
    titlesWon: stats.titleWins.size,
    _metrics: {
      matches: stats.matches.size,
      seasons,
      battingInnings: stats.battingInnings.size,
      bowlingInnings: stats.bowlingInnings.size,
      runs: stats.batterRuns,
      ballsFaced: stats.batterBalls,
      strikeRate: Number(strikeRate.toFixed(2)),
      boundaryRate: Number(boundaryRate.toFixed(2)),
      sixRate: Number(sixRate.toFixed(2)),
      wickets: stats.wickets,
      ballsBowled: stats.ballsBowled,
      dotBallRate: Number((dotRate * 100).toFixed(2)),
      deathBowlingShare: Number((bowlingDeathShare * 100).toFixed(2)),
      wicketsPerBall: Number(wicketsPerBall.toFixed(4)),
      playerOfMatch: stats.playerOfMatch,
      primaryBattingPosition: primaryPosition || null,
    },
  };
}

function validateProfileShape(player) {
  return requiredFields.filter((field) => !(field in player));
}

async function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing source CSV at ${inputPath}`);
  }

  const players = new Map();
  const columnsMissing = new Map();
  const teams = new Set();
  const seasons = new Set();
  const duplicateBallKeys = new Set();
  const duplicateRows = new Set();
  const matchWinners = new Map();
  const matchPlayerOfMatchSeen = new Set();
  const matchCaptains = new Map();
  const seasonBatting = new Map();
  const seasonBowling = new Map();
  const parseWarnings = [];
  let rowCount = 0;
  let duplicateRowCount = 0;
  let header = [];

  const stream = fs.createReadStream(inputPath);
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (!header.length) {
      header = parseCsvLine(line);
      continue;
    }

    if (!line.trim()) continue;
    rowCount++;

    const values = parseCsvLine(line);
    if (values.length !== header.length && parseWarnings.length < 20) {
      parseWarnings.push(`Row ${rowCount} has ${values.length} values; expected ${header.length}`);
    }

    const row = {};
    header.forEach((column, index) => {
      row[column || "row_index"] = values[index] ?? "";
      if (!normalizeText(values[index])) increment(columnsMissing, column || "row_index");
    });

    const compactRow = values.join("\u001f");
    if (duplicateRows.has(compactRow)) duplicateRowCount++;
    duplicateRows.add(compactRow);

    const matchId = normalizeText(row.match_id);
    const season = seasonYear(row.season, row.year);
    if (season) seasons.add(season);
    const battingTeam = normalizeTeam(row.batting_team);
    const bowlingTeam = normalizeTeam(row.bowling_team);
    if (battingTeam) teams.add(battingTeam);
    if (bowlingTeam) teams.add(bowlingTeam);

    const batterName = cleanName(row.batter);
    const bowlerName = cleanName(row.bowler);
    const nonStrikerName = cleanName(row.non_striker);
    const playerOutName = cleanName(row.player_out);
    const pomName = cleanName(row.player_of_match);
    const winner = normalizeTeam(row.match_won_by);
    const stage = normalizeText(row.stage);
    const validBall = number(row.valid_ball) === 1;
    const over = number(row.over);
    const ballNo = normalizeText(row.ball_no);
    const innings = normalizeText(row.innings);
    const runsBatter = number(row.runs_batter);
    const runsBowler = number(row.runs_bowler);
    const wicketKind = normalizeText(row.wicket_kind).toLowerCase();
    const strikerOut = normalizeText(row.striker_out).toLowerCase() === "true";

    if (matchId && winner) matchWinners.set(matchId, winner);

    const batter = getPlayer(players, batterName);
    if (batter) {
      batter.teams.add(battingTeam);
      batter.seasons.add(season);
      batter.matches.add(matchId);
      batter.battingInnings.add(`${matchId}:${innings}`);
      increment(batter.battingPositions, normalizeText(row.bat_pos));
      batter.batterRuns += runsBatter;
      if (validBall) {
        batter.batterBalls++;
        if (over < 6) batter.battingBallsByOver.powerplay++;
        else if (over >= 16) batter.battingBallsByOver.death++;
        else batter.battingBallsByOver.middle++;
      }
      if (runsBatter === 4) batter.fours++;
      if (runsBatter === 6) batter.sixes++;
      if (finalStages.has(stage)) batter.playoffRuns += runsBatter;
      if (stage === "Final") batter.finalRuns += runsBatter;
      if (winner && winner === battingTeam) batter.wins++;
      if (stage === "Final" && winner === battingTeam && season) {
        batter.titleWins.add(`${season}:${winner}`);
      }
      increment(seasonBatting, `${season}::${batterName}`, runsBatter);
    }

    if (nonStrikerName) {
      const nonStriker = getPlayer(players, nonStrikerName);
      nonStriker.teams.add(battingTeam);
      nonStriker.seasons.add(season);
      nonStriker.matches.add(matchId);
      increment(nonStriker.battingPositions, normalizeText(row.non_striker_pos));
    }

    const bowler = getPlayer(players, bowlerName);
    if (bowler) {
      bowler.teams.add(bowlingTeam);
      bowler.seasons.add(season);
      bowler.matches.add(matchId);
      bowler.bowlingInnings.add(`${matchId}:${innings}`);
      if (validBall) {
        bowler.ballsBowled++;
        bowler.runsConceded += runsBowler;
        if (runsBowler === 0) bowler.dotBalls++;
        if (over >= 16) {
          bowler.deathBalls++;
          bowler.deathRunsConceded += runsBowler;
        }
      }
      if (wicketKindsForBowler.has(wicketKind)) {
        bowler.wickets++;
        if (over >= 16) bowler.deathWickets++;
        if (finalStages.has(stage)) bowler.playoffWickets++;
        if (stage === "Final") bowler.finalWickets++;
        increment(seasonBowling, `${season}::${bowlerName}`, 1);
      }
      if (winner && winner === bowlingTeam) bowler.wins++;
      if (stage === "Final" && winner === bowlingTeam && season) {
        bowler.titleWins.add(`${season}:${winner}`);
      }
    }

    if (playerOutName) {
      const playerOut = getPlayer(players, playerOutName);
      playerOut.dismissals++;
    }

    if (pomName && matchId && !matchPlayerOfMatchSeen.has(`${matchId}:${pomName}`)) {
      const pom = getPlayer(players, pomName);
      if (pom) pom.playerOfMatch++;
      matchPlayerOfMatchSeen.add(`${matchId}:${pomName}`);
    }

    if (matchId && ballNo) {
      const ballKey = `${matchId}:${innings}:${ballNo}:${batterName}:${bowlerName}:${runsBatter}:${runsBowler}:${wicketKind}:${strikerOut}`;
      duplicateBallKeys.add(ballKey);
    }
  }

  const rawProfiles = [...players.values()].filter((stats) => stats.matches.size > 0);
  const maxYear = Math.max(...[...seasons]);
  const battingProfiles = rawProfiles.filter((stats) => stats.batterBalls >= 75);
  const bowlingProfiles = rawProfiles.filter((stats) => stats.ballsBowled >= 75);
  const thresholds = {
    strikeRate65: percentile(battingProfiles.map((p) => (p.batterRuns / p.batterBalls) * 100), 0.65),
    strikeRate70: percentile(battingProfiles.map((p) => (p.batterRuns / p.batterBalls) * 100), 0.7),
    strikeRate75: percentile(battingProfiles.map((p) => (p.batterRuns / p.batterBalls) * 100), 0.75),
    boundaryRate40: percentile(battingProfiles.map((p) => ((p.fours + p.sixes) / p.batterBalls) * 100), 0.4),
    boundaryRate75: percentile(battingProfiles.map((p) => ((p.fours + p.sixes) / p.batterBalls) * 100), 0.75),
    sixRate70: percentile(battingProfiles.map((p) => (p.sixes / p.batterBalls) * 100), 0.7),
    sixRate80: percentile(battingProfiles.map((p) => (p.sixes / p.batterBalls) * 100), 0.8),
    dotRate60: percentile(bowlingProfiles.map((p) => p.dotBalls / p.ballsBowled), 0.6),
    dotRate70: percentile(bowlingProfiles.map((p) => p.dotBalls / p.ballsBowled), 0.7),
    deathWickets60: percentile(bowlingProfiles.map((p) => p.deathWickets), 0.6),
    playoffRuns80: percentile(rawProfiles.map((p) => p.playoffRuns), 0.8),
    playoffWickets80: percentile(rawProfiles.map((p) => p.playoffWickets), 0.8),
    playerOfMatch85: percentile(rawProfiles.map((p) => p.playerOfMatch), 0.85),
    playerOfMatch90: percentile(rawProfiles.map((p) => p.playerOfMatch), 0.9),
    matches85: percentile(rawProfiles.map((p) => p.matches.size), 0.85),
    matches90: percentile(rawProfiles.map((p) => p.matches.size), 0.9),
    runs90: percentile(rawProfiles.map((p) => p.batterRuns), 0.9),
    runs95: percentile(rawProfiles.map((p) => p.batterRuns), 0.95),
    wickets90: percentile(rawProfiles.map((p) => p.wickets), 0.9),
    wickets95: percentile(rawProfiles.map((p) => p.wickets), 0.95),
  };

  const orangeWinners = new Set();
  const purpleWinners = new Set();
  for (const season of seasons) {
    const batting = [...seasonBatting.entries()]
      .filter(([key]) => key.startsWith(`${season}::`))
      .sort((a, b) => b[1] - a[1])[0];
    const bowling = [...seasonBowling.entries()]
      .filter(([key]) => key.startsWith(`${season}::`))
      .sort((a, b) => b[1] - a[1])[0];
    if (batting) orangeWinners.add(batting[0].split("::")[1]);
    if (bowling) purpleWinners.add(bowling[0].split("::")[1]);
  }

  const profiles = rawProfiles
    .map((stats) => {
      const profile = buildProfile(stats, thresholds, maxYear);
      profile.orangeCap = orangeWinners.has(stats.name);
      profile.purpleCap = purpleWinners.has(stats.name);
      return profile;
    })
    .sort((a, b) => b._metrics.matches - a._metrics.matches || a.name.localeCompare(b.name));

  const publicProfiles = profiles.map(({ _metrics, ...player }) => player);
  const metrics = Object.fromEntries(profiles.map((player) => [player.id, player._metrics]));

  const report = {
    source: "IPL.csv",
    generatedAt: new Date().toISOString(),
    rows: rowCount,
    columns: header,
    columnCount: header.length,
    playerCount: publicProfiles.length,
    duplicateRows: duplicateRowCount,
    normalizedTeams: [...teams].sort(),
    seasons: [...seasons].sort((a, b) => a - b),
    missingValues: Object.fromEntries([...columnsMissing.entries()].sort((a, b) => b[1] - a[1])),
    parseWarnings,
    limitations: [
      "The source CSV does not contain country, batting hand, wicket-keeper, captain, batting style, or bowling style metadata.",
      "Those unavailable biographical fields are normalized to Unknown/false unless inferable from ball-by-ball performance.",
      "Pacer/spinner/mystery-spinner cannot be reliably inferred without bowling-style source data, so they remain false by default.",
    ],
    engineeredThresholds: thresholds,
    validation: {
      missingRequiredFieldProfiles: publicProfiles
        .map((player) => ({ id: player.id, missing: validateProfileShape(player) }))
        .filter((entry) => entry.missing.length > 0),
    },
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "players.json"), `${JSON.stringify(publicProfiles, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "player-metrics.json"), `${JSON.stringify(metrics, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "dataset-report.json"), `${JSON.stringify(report, null, 2)}\n`);

  console.log(`Processed ${rowCount} rows into ${publicProfiles.length} player profiles.`);
  console.log(`Seasons: ${report.seasons[0]}-${report.seasons[report.seasons.length - 1]}`);
  console.log(`Teams: ${report.normalizedTeams.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
