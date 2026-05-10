/**
 * Adds missing IPL legends to the players.json database.
 * Run: node scripts/addLegends.mjs
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const playersPath = join(__dirname, "..", "src", "data", "players.json");

const players = JSON.parse(readFileSync(playersPath, "utf-8"));
const existingNames = new Set(players.map(p => p.name));

// Template for a retired legend
function legend(id, name, country, role, bat, bowl, teams, currentTeam, opts) {
  return {
    id, name, country, role,
    battingStyle: bat, bowlingStyle: bowl,
    teams, currentTeam,
    historicalTeams: teams,
    active: false, retired: true,
    overseas: country !== "India",
    wicketKeeper: opts.wk || false,
    opener: opts.opener || false,
    middleOrder: opts.middleOrder || false,
    finisher: opts.finisher || false,
    powerHitter: opts.powerHitter || false,
    anchorBatter: opts.anchor || false,
    spinner: opts.spinner || false,
    pacer: opts.pacer || false,
    deathBowler: opts.deathBowler || false,
    captain: opts.captain || false,
    titleWinningCaptain: opts.titleCaptain || false,
    orangeCap: opts.orangeCap || false,
    purpleCap: opts.purpleCap || false,
    leftHanded: bat === "Left",
    aggressive: opts.aggressive || false,
    defensive: opts.defensive || false,
    mysterySpinner: false,
    famousForYorkers: opts.yorkers || false,
    playoffsHero: opts.playoffsHero || false,
    fanFavorite: opts.fanFav || true,
    iconic: opts.iconic || true,
    battingPosition: opts.batPos || "middle",
    debutYear: opts.debut || 2008,
    titlesWon: opts.titles || 0,
    dataConfidence: { country: 0.95, role: 0.95, name: 1 },
    era: opts.era || "founding-era",
    archetype: opts.archetype || "legend",
    dnaTags: opts.tags || [],
    iconicMoments: opts.moments || [],
    popularityScore: opts.popularity || 85,
    rarity: "common",
    fullName: name, shortName: name.split(" ").pop(),
    nickname: opts.nick || "",
    nationality: country,
    ageGroup: "veteran",
    activeStatus: "retired",
    IPLDebutYear: opts.debut || 2008,
    IPLLastYear: opts.lastYear || 2018,
    dominantEra: opts.domEra || "2008-2013",
    battingHand: bat,
    primaryRole: role,
    secondaryRole: opts.secRole || "",
    latestSeasonTeam: currentTeam,
    allTeamsPlayedFor: teams,
    strongestFranchiseAssociation: opts.strongTeam || "",
    franchiseLoyalty: teams.length <= 2 ? "one-franchise" : "journeyman",
    seasonsPlayed: [],
    auctionHistory: [],
    replacementPlayerStatus: { replacement: false, temporarySigning: false, netReplacement: false },
    tacticalTags: opts.tactical || [],
    searchText: `${name.toLowerCase()} ${country.toLowerCase()} ${teams.join(" ").toLowerCase()} ${role} ${(opts.tags || []).join(" ")} retired legend`
  };
}

const legends = [
  legend("gautam-gambhir", "Gautam Gambhir", "India", "batsman", "Left", "none",
    ["Kolkata Knight Riders", "Delhi Capitals", "Lucknow Super Giants"], "Kolkata Knight Riders",
    { opener: true, captain: true, titleCaptain: true, aggressive: true, titles: 2, debut: 2008, lastYear: 2018,
      nick: "Gauti", tags: ["kkr-legend", "opener", "captain", "title-winner", "aggressive-opener", "indian-player", "early-ipl-player"],
      moments: ["2012-kkr-title", "2014-kkr-title"], strongTeam: "kkr-icon", batPos: "opener", popularity: 90 }),

  legend("sachin-tendulkar", "Sachin Tendulkar", "India", "batsman", "Right", "Right-arm medium",
    ["Mumbai Indians"], "Mumbai Indians",
    { opener: true, iconic: true, titles: 1, debut: 2008, lastYear: 2013,
      nick: "Master Blaster", tags: ["god-of-cricket", "mi-legend", "opener", "iconic", "indian-player", "one-franchise"],
      moments: ["2013-mi-title"], strongTeam: "mi-icon", batPos: "opener", popularity: 100, fanFav: true }),

  legend("yuvraj-singh", "Yuvraj Singh", "India", "all-rounder", "Left", "Left-arm orthodox",
    ["Kings XI Punjab", "Pune Warriors India", "Royal Challengers Bengaluru", "Delhi Capitals", "Sunrisers Hyderabad", "Mumbai Indians"], "Mumbai Indians",
    { middleOrder: true, powerHitter: true, aggressive: true, spinner: true, debut: 2008, lastYear: 2019,
      nick: "Yuvi", tags: ["six-sixes", "cancer-survivor", "power-hitter", "left-hander", "journeyman", "indian-player"],
      batPos: "middle", popularity: 92 }),

  legend("virender-sehwag", "Virender Sehwag", "India", "batsman", "Right", "Right-arm off-break",
    ["Delhi Capitals", "Kings XI Punjab"], "Kings XI Punjab",
    { opener: true, aggressive: true, powerHitter: true, captain: true, debut: 2008, lastYear: 2015,
      nick: "Nawab of Najafgarh", tags: ["explosive-opener", "aggressive", "power-hitter", "dc-legend", "indian-player"],
      batPos: "opener", popularity: 88 }),

  legend("suresh-raina", "Suresh Raina", "India", "batsman", "Left", "Right-arm off-break",
    ["Chennai Super Kings", "Gujarat Lions"], "Chennai Super Kings",
    { middleOrder: true, anchor: true, debut: 2008, lastYear: 2021,
      nick: "Chinna Thala", tags: ["csk-legend", "mr-ipl", "fielding-genius", "left-hander", "indian-player", "one-franchise"],
      moments: ["5000-ipl-runs-first"], strongTeam: "csk-icon", batPos: "middle", popularity: 90, titles: 4 }),

  legend("harbhajan-singh", "Harbhajan Singh", "India", "bowler", "Right", "Right-arm off-break",
    ["Mumbai Indians", "Chennai Super Kings", "Kolkata Knight Riders"], "Kolkata Knight Riders",
    { spinner: true, debut: 2008, lastYear: 2021,
      nick: "Bhajji", tags: ["turbanator", "spinner", "mi-legend", "indian-player", "veteran"],
      batPos: "lower", popularity: 80, titles: 2 }),

  legend("zaheer-khan", "Zaheer Khan", "India", "bowler", "Right", "Left-arm fast-medium",
    ["Mumbai Indians", "Royal Challengers Bengaluru", "Delhi Capitals"], "Delhi Capitals",
    { pacer: true, deathBowler: true, debut: 2008, lastYear: 2017,
      nick: "Zak", tags: ["swing-king", "pacer", "left-arm-fast", "indian-player", "death-bowler"],
      batPos: "lower", popularity: 75 }),

  legend("chris-gayle", "Chris Gayle", "West Indies", "batsman", "Left", "Right-arm off-break",
    ["Kolkata Knight Riders", "Royal Challengers Bengaluru", "Kings XI Punjab"], "Kings XI Punjab",
    { opener: true, powerHitter: true, aggressive: true, debut: 2008, lastYear: 2021,
      nick: "Universe Boss", tags: ["universe-boss", "six-machine", "t20-legend", "rcb-legend", "power-hitter", "left-hander"],
      moments: ["175-vs-pwi", "fastest-ipl-century"], batPos: "opener", popularity: 95, orangeCap: true }),

  legend("ab-de-villiers", "AB de Villiers", "South Africa", "batsman", "Right", "Right-arm medium",
    ["Royal Challengers Bengaluru", "Delhi Capitals"], "Royal Challengers Bengaluru",
    { middleOrder: true, powerHitter: true, aggressive: true, wk: true, debut: 2008, lastYear: 2021,
      nick: "Mr 360", tags: ["mr-360", "rcb-legend", "genius-batter", "power-hitter", "wicketkeeper", "south-african"],
      batPos: "middle", popularity: 95, fanFav: true, strongTeam: "rcb-icon" }),

  legend("shane-watson", "Shane Watson", "Australia", "all-rounder", "Right", "Right-arm fast-medium",
    ["Rajasthan Royals", "Royal Challengers Bengaluru", "Chennai Super Kings"], "Chennai Super Kings",
    { opener: true, powerHitter: true, aggressive: true, pacer: true, titles: 2, debut: 2008, lastYear: 2020,
      nick: "Watto", tags: ["all-rounder", "rr-legend", "csk-hero", "power-hitter", "australian"],
      moments: ["2008-rr-title", "2018-csk-final-century"], batPos: "opener", popularity: 82 }),

  legend("brendon-mccullum", "Brendon McCullum", "New Zealand", "batsman", "Right", "none",
    ["Kolkata Knight Riders", "Chennai Super Kings", "Gujarat Lions"], "Gujarat Lions",
    { opener: true, aggressive: true, powerHitter: true, wk: true, debut: 2008, lastYear: 2016,
      nick: "Baz", tags: ["first-ipl-century", "kkr-hero", "explosive-opener", "new-zealander"],
      moments: ["158-first-ipl-match"], batPos: "opener", popularity: 78 }),

  legend("lasith-malinga", "Lasith Malinga", "Sri Lanka", "bowler", "Right", "Right-arm fast",
    ["Mumbai Indians"], "Mumbai Indians",
    { pacer: true, deathBowler: true, yorkers: true, titles: 4, debut: 2009, lastYear: 2019,
      nick: "Slinga Malinga", tags: ["yorker-king", "mi-legend", "death-bowler", "one-franchise", "sri-lankan"],
      moments: ["hat-trick-specialist"], strongTeam: "mi-icon", batPos: "tail", popularity: 88 }),

  legend("adam-gilchrist", "Adam Gilchrist", "Australia", "batsman", "Left", "none",
    ["Deccan Chargers", "Kings XI Punjab"], "Kings XI Punjab",
    { opener: true, wk: true, aggressive: true, captain: true, titleCaptain: true, titles: 1, debut: 2008, lastYear: 2013,
      nick: "Gilly", tags: ["deccan-chargers-legend", "keeper-batter", "australian", "captain", "title-winner"],
      moments: ["2009-dc-title"], batPos: "opener", popularity: 78 }),

  legend("jacques-kallis", "Jacques Kallis", "South Africa", "all-rounder", "Right", "Right-arm fast-medium",
    ["Royal Challengers Bengaluru", "Kolkata Knight Riders"], "Kolkata Knight Riders",
    { middleOrder: true, pacer: true, anchor: true, debut: 2008, lastYear: 2014,
      tags: ["greatest-all-rounder", "south-african", "anchor", "veteran"], batPos: "middle", popularity: 70 }),

  legend("dale-steyn", "Dale Steyn", "South Africa", "bowler", "Right", "Right-arm fast",
    ["Deccan Chargers", "Sunrisers Hyderabad", "Royal Challengers Bengaluru"], "Royal Challengers Bengaluru",
    { pacer: true, titles: 1, debut: 2008, lastYear: 2020,
      nick: "Steyn Gun", tags: ["fastest-bowler", "south-african", "pacer", "swing-master"], batPos: "tail", popularity: 75 }),

  legend("kieron-pollard", "Kieron Pollard", "West Indies", "all-rounder", "Right", "Right-arm medium",
    ["Mumbai Indians"], "Mumbai Indians",
    { finisher: true, powerHitter: true, aggressive: true, titles: 5, debut: 2010, lastYear: 2022,
      nick: "Polly", tags: ["mi-legend", "finisher", "power-hitter", "one-franchise", "west-indian"],
      strongTeam: "mi-icon", batPos: "lower-middle", popularity: 85 }),

  legend("anil-kumble", "Anil Kumble", "India", "bowler", "Right", "Right-arm leg-break",
    ["Royal Challengers Bengaluru"], "Royal Challengers Bengaluru",
    { spinner: true, captain: true, debut: 2008, lastYear: 2010,
      nick: "Jumbo", tags: ["leg-spinner", "rcb-captain", "indian-legend", "one-franchise"], batPos: "tail", popularity: 72 }),

  legend("sourav-ganguly", "Sourav Ganguly", "India", "batsman", "Left", "Right-arm medium",
    ["Kolkata Knight Riders", "Pune Warriors India"], "Pune Warriors India",
    { middleOrder: true, captain: true, aggressive: true, debut: 2008, lastYear: 2012,
      nick: "Dada", tags: ["dada", "kkr-captain", "indian-legend", "left-hander", "aggressive"], batPos: "middle", popularity: 82 }),

  legend("kevin-pietersen", "Kevin Pietersen", "England", "batsman", "Right", "Right-arm off-break",
    ["Royal Challengers Bengaluru", "Delhi Capitals", "Rising Pune Supergiant"], "Rising Pune Supergiant",
    { middleOrder: true, aggressive: true, powerHitter: true, debut: 2009, lastYear: 2016,
      nick: "KP", tags: ["switch-hit", "english", "aggressive-batter"], batPos: "middle", popularity: 72 }),

  legend("michael-hussey", "Michael Hussey", "Australia", "batsman", "Left", "none",
    ["Chennai Super Kings", "Mumbai Indians"], "Mumbai Indians",
    { middleOrder: true, anchor: true, titles: 2, debut: 2008, lastYear: 2013,
      nick: "Mr Cricket", tags: ["mr-cricket", "csk-legend", "anchor", "australian", "calm-finisher"],
      strongTeam: "csk-icon", batPos: "middle", popularity: 72 }),

  legend("shane-warne", "Shane Warne", "Australia", "bowler", "Right", "Right-arm leg-break",
    ["Rajasthan Royals"], "Rajasthan Royals",
    { spinner: true, captain: true, titleCaptain: true, titles: 1, debut: 2008, lastYear: 2011,
      nick: "Warnie", tags: ["leg-spin-king", "rr-legend", "captain", "title-winner", "australian", "one-franchise"],
      moments: ["2008-rr-title-captain"], strongTeam: "rr-icon", batPos: "tail", popularity: 88 }),

  legend("brett-lee", "Brett Lee", "Australia", "bowler", "Right", "Right-arm fast",
    ["Kolkata Knight Riders"], "Kolkata Knight Riders",
    { pacer: true, debut: 2008, lastYear: 2012,
      nick: "Binga", tags: ["express-pace", "australian", "kkr-pacer", "one-franchise"], batPos: "tail", popularity: 72 }),

  legend("david-warner", "David Warner", "Australia", "batsman", "Left", "Right-arm leg-break",
    ["Delhi Capitals", "Sunrisers Hyderabad"], "Delhi Capitals",
    { opener: true, aggressive: true, powerHitter: true, captain: true, titleCaptain: true,
      orangeCap: true, titles: 1, debut: 2009, lastYear: 2024, active: false,
      nick: "Bull", tags: ["srh-legend", "orange-cap-king", "aggressive-opener", "australian", "title-captain"],
      moments: ["2016-srh-title", "multiple-orange-caps"], strongTeam: "srh-icon", batPos: "opener", popularity: 90 }),

  legend("ashish-nehra", "Ashish Nehra", "India", "bowler", "Right", "Left-arm fast-medium",
    ["Delhi Capitals", "Chennai Super Kings", "Kolkata Knight Riders", "Sunrisers Hyderabad", "Royal Challengers Bengaluru"], "Royal Challengers Bengaluru",
    { pacer: true, deathBowler: true, debut: 2008, lastYear: 2017,
      tags: ["left-arm-pacer", "journeyman", "indian-player", "veteran-pacer"], batPos: "tail", popularity: 65 }),

  legend("dinesh-karthik", "Dinesh Karthik", "India", "batsman", "Right", "none",
    ["Delhi Capitals", "Kings XI Punjab", "Mumbai Indians", "Royal Challengers Bengaluru", "Kolkata Knight Riders", "Gujarat Lions"], "Royal Challengers Bengaluru",
    { middleOrder: true, finisher: true, wk: true, captain: true, debut: 2008, lastYear: 2024,
      nick: "DK", tags: ["finisher", "wicketkeeper", "journeyman", "indian-player", "nidahas-trophy"],
      moments: ["nidahas-trophy-final"], batPos: "lower-middle", popularity: 78 }),
];

let added = 0;
for (const leg of legends) {
  if (existingNames.has(leg.name)) {
    console.log(`SKIP (exists): ${leg.name}`);
    continue;
  }
  players.push(leg);
  added++;
  console.log(`ADDED: ${leg.name}`);
}

writeFileSync(playersPath, JSON.stringify(players, null, 2));
console.log(`\nDone! Added ${added} legends. Total players: ${players.length}`);
