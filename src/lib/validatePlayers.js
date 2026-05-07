import players from "@/data/players";
import { traitFields } from "./player-utils";

export const allowedRoles = new Set(["batsman", "bowler", "all-rounder", "wicket-keeper", "unknown"]);
export const allowedBattingPositions = new Set(["", "opener", "top-middle", "middle-lower", "tail"]);
export const allowedTeams = new Set([
  "Chennai Super Kings",
  "Deccan Chargers",
  "Delhi Capitals",
  "Gujarat Lions",
  "Gujarat Titans",
  "Kochi Tuskers Kerala",
  "Kolkata Knight Riders",
  "Lucknow Super Giants",
  "Mumbai Indians",
  "Pune Warriors India",
  "Punjab Kings",
  "Rajasthan Royals",
  "Rising Pune Supergiant",
  "Royal Challengers Bengaluru",
  "Sunrisers Hyderabad",
]);

const requiredFields = [
  "id",
  "name",
  "country",
  "role",
  "battingStyle",
  "bowlingStyle",
  "teams",
  "currentTeam",
  "historicalTeams",
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

export function validatePlayers(candidatePlayers = players) {
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenNames = new Set();

  candidatePlayers.forEach((player, index) => {
    const label = player?.id || player?.name || `index:${index}`;

    for (const field of requiredFields) {
      if (!(field in player)) {
        errors.push(`${label}: missing required field "${field}"`);
      }
    }

    if (seenIds.has(player.id)) errors.push(`${label}: duplicate player id`);
    if (seenNames.has(player.name)) errors.push(`${label}: duplicate player name`);
    seenIds.add(player.id);
    seenNames.add(player.name);

    if (!allowedRoles.has(player.role)) {
      errors.push(`${label}: invalid role "${player.role}"`);
    }

    if (!Array.isArray(player.teams) || player.teams.length === 0) {
      errors.push(`${label}: teams must be a non-empty array`);
    } else {
      for (const team of player.teams) {
        if (!allowedTeams.has(team)) {
          errors.push(`${label}: invalid team "${team}"`);
        }
      }
    }

    if (!player.currentTeam || !allowedTeams.has(player.currentTeam)) {
      errors.push(`${label}: invalid currentTeam "${player.currentTeam}"`);
    }

    if (!Array.isArray(player.historicalTeams)) {
      errors.push(`${label}: historicalTeams must be an array`);
    } else {
      for (const team of player.historicalTeams) {
        if (!allowedTeams.has(team)) {
          errors.push(`${label}: invalid historical team "${team}"`);
        }
      }
    }

    if (!allowedBattingPositions.has(player.battingPosition)) {
      errors.push(`${label}: invalid battingPosition "${player.battingPosition}"`);
    }

    for (const trait of traitFields) {
      if (typeof player[trait] !== "boolean") {
        errors.push(`${label}: trait "${trait}" must be boolean`);
      }
    }

    if (player.active === player.retired) {
      warnings.push(`${label}: active and retired flags are not mutually distinctive`);
    }

    if (player.role === "bowler" && player.powerHitter && player.anchorBatter) {
      warnings.push(`${label}: bowler has conflicting batting style traits`);
    }

    if (player.role === "batsman" && player.deathBowler) {
      warnings.push(`${label}: batsman is marked as deathBowler`);
    }

    if (!Number.isInteger(player.debutYear) || player.debutYear < 0) {
      errors.push(`${label}: debutYear must be a non-negative integer`);
    }

    if (!Number.isInteger(player.titlesWon) || player.titlesWon < 0) {
      errors.push(`${label}: titlesWon must be a non-negative integer`);
    }
  });

  return {
    valid: errors.length === 0,
    playerCount: candidatePlayers.length,
    errors,
    warnings,
  };
}

export default validatePlayers;
