import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const rootDir = process.cwd();
const cleanCsvPath = path.join(rootDir, "IPL dataset final.csv");
const oldJsonPath = path.join(rootDir, "src", "data", "players.json");
const aliasesPath = path.join(rootDir, "src", "data", "playerAliases.json");
const outPath = path.join(rootDir, "src", "data", "players.json");

// 1. Load aliases
const playerAliases = JSON.parse(fs.readFileSync(aliasesPath, "utf8"));
function normalizeName(name) {
  name = name.trim();
  return playerAliases[name] || name;
}

// 2. Load clean CSV
const cleanCsvRaw = fs.readFileSync(cleanCsvPath, "utf8");
const cleanRecords = parse(cleanCsvRaw, {
  columns: true,
  skip_empty_lines: true,
});

const cleanPlayerMap = new Map();
cleanRecords.forEach((row) => {
  const name = normalizeName(row.Player);
  const roleRaw = row.Paying_Role ? row.Paying_Role.toLowerCase().trim() : "";
  let role = "batsman";
  if (roleRaw.includes("bowler")) role = "bowler";
  else if (roleRaw.includes("all rounder") || roleRaw.includes("all-rounder") || roleRaw.includes("all")) role = "all-rounder";
  else if (roleRaw.includes("wicket") || roleRaw.includes("wk")) role = "wicket-keeper";
  
  // Set basic features
  cleanPlayerMap.set(name, {
    name,
    country: row.COUNTRY || null,
    teams: row.TEAM ? [row.TEAM] : [],
    role,
    age: parseInt(row.AGE) || null,
    dataConfidence: {
      country: 1.0,
      role: 1.0,
      name: 1.0
    }
  });
});

// 3. Load old JSON (to merge, not overwrite)
const oldData = JSON.parse(fs.readFileSync(oldJsonPath, "utf8"));

const mergedPlayers = new Map();

for (const rawOldPlayer of oldData) {
  const rawName = rawOldPlayer.name;
  const name = normalizeName(rawName);

  if (mergedPlayers.has(name)) {
    // Skip duplicate names but we could merge stats if needed.
    // For now, identity is primary.
    continue;
  }

  // Get clean data if it exists
  const cleanData = cleanPlayerMap.get(name);
  
  // Start with old data structure to retain the rich inferred traits
  const merged = { ...rawOldPlayer, name };
  merged.id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  
  if (cleanData) {
    // Override with clean metadata
    merged.country = cleanData.country || merged.country;
    if (merged.country === "Unknown" || merged.country === "null") merged.country = null;
    
    merged.role = cleanData.role || merged.role;
    
    if (cleanData.teams.length > 0 && !merged.teams.includes(cleanData.teams[0])) {
      merged.teams.push(cleanData.teams[0]);
    }
    merged.currentTeam = cleanData.teams[0] || merged.currentTeam;
    
    merged.dataConfidence = {
      country: 0.95,
      role: 0.95,
      name: 1.0
    };
  } else {
    // It's a player from the 700+ dataset without a clean counterpart
    // Ensure "Unknown" isn't preserved
    if (merged.country === "Unknown") merged.country = null;
    if (merged.battingStyle === "unknown") merged.battingStyle = null;
    if (merged.bowlingStyle === "unknown") merged.bowlingStyle = null;

    merged.dataConfidence = {
      country: merged.country ? 0.8 : 0.0,
      role: 0.8,
      name: 0.8
    };
  }
  
  mergedPlayers.set(name, merged);
}

// Ensure all clean players that weren't in oldData are also added (e.g. Jacob Bethell)
cleanPlayerMap.forEach((cleanData, name) => {
  if (!mergedPlayers.has(name)) {
     mergedPlayers.set(name, {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: cleanData.name,
        country: cleanData.country,
        role: cleanData.role,
        teams: cleanData.teams,
        currentTeam: cleanData.teams[0] || null,
        historicalTeams: [],
        battingStyle: null,
        bowlingStyle: null,
        active: true,
        dataConfidence: cleanData.dataConfidence
     });
  }
});

const finalArray = Array.from(mergedPlayers.values());

fs.writeFileSync(outPath, JSON.stringify(finalArray, null, 2));

console.log(`Generated ${finalArray.length} players with hybrid data approach.`);
