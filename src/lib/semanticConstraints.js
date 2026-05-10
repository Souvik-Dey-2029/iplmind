/**
 * Semantic Constraint Engine
 * 
 * Builds a set of INFERRED FACTS from the question-answer history.
 * Used to prevent contradictory or redundant questions.
 * 
 * Example: If user answered "Yes" to "Is this player from India?",
 * the engine infers { indian: true, overseas: false } and blocks
 * all future country:Australia, country:NZ, overseas questions.
 */

import { CONCEPT_GROUPS } from "./questionEngine.js";

/**
 * Build the complete set of inferred facts from question history.
 * Returns a map of { attribute: true/false }
 */
export function buildInferredFacts(history) {
  const facts = {};

  for (const entry of history) {
    const questionId = entry.questionId;
    const answer = normalizeAnswer(entry.answer);
    if (!questionId || answer === "neutral") continue;

    // Static concept group inferences
    for (const group of Object.values(CONCEPT_GROUPS)) {
      if (group.ids.includes(questionId)) {
        const inferences = answer === "yes" ? group.infers_yes : group.infers_no;
        Object.assign(facts, inferences);
        break;
      }
    }

    // Dynamic question inferences
    if (answer === "yes") {
      // "Is this player from India?" → indian=true, overseas=false
      if (questionId === "indian") {
        facts.indian = true;
        facts.overseas = false;
        facts.confirmedCountry = "India";
      }
      // "Is this player overseas?" → overseas=true, indian=false
      if (questionId === "overseas") {
        facts.overseas = true;
        facts.indian = false;
      }
      // "Is this player from {Country}?" → confirmedCountry set
      if (questionId.startsWith("country:")) {
        facts.confirmedCountry = questionId.replace("country:", "");
        facts.overseas = true;
        facts.indian = false;
      }
      // Current team confirmed
      if (questionId.startsWith("current-team:")) {
        facts.confirmedCurrentTeam = questionId.replace("current-team:", "");
      }
      // Role confirmations
      if (questionId === "batsman") { facts.confirmedRole = "batsman"; }
      if (questionId === "bowler") { facts.confirmedRole = "bowler"; }
      if (questionId === "allrounder") { facts.confirmedRole = "all-rounder"; }
      if (questionId === "wicketkeeper") { facts.confirmedRole = "wicketkeeper"; }
      if (questionId === "spinner") { facts.confirmedBowlingType = "spin"; }
      if (questionId === "pacer") { facts.confirmedBowlingType = "pace"; }
      if (questionId === "opener") { facts.confirmedBattingPos = "opener"; }
      if (questionId === "middle-order") { facts.confirmedBattingPos = "middle-order"; }
      if (questionId === "finisher") { facts.confirmedBattingPos = "finisher"; }
      
      // Era confirmations
      if (questionId === "veteran") { facts.isVeteran = true; }
      if (questionId === "recent-debut") { facts.isRecentDebut = true; }
      if (questionId === "founding-era") { facts.isFoundingEra = true; }
      if (questionId === "dominated-2011-2015") { facts.peakEra = "2011-2015"; }
      if (questionId === "post-2020-player") { facts.isRecentDebut = true; facts.peakEra = "2021-2026"; }
      if (questionId === "ipl-specialist") { facts.iplSpecialist = true; }
      if (questionId === "journeyman-player") { facts.journeyman = true; }
      if (questionId === "obscure-short-career") { facts.obscureShortCareer = true; }
      if (questionId.startsWith("semantic:")) {
        if (!facts.confirmedSemanticTags) facts.confirmedSemanticTags = new Set();
        facts.confirmedSemanticTags.add(questionId.replace("semantic:", ""));
      }
    }

    if (answer === "no") {
      // "Is this player from India?" → NO → overseas=true
      if (questionId === "indian") {
        facts.indian = false;
        facts.overseas = true;
      }
      if (questionId === "overseas") {
        facts.overseas = false;
        facts.indian = true;
        facts.confirmedCountry = "India";
      }
      // Specific country rejection
      if (questionId.startsWith("country:")) {
        const country = questionId.replace("country:", "");
        if (!facts.rejectedCountries) facts.rejectedCountries = new Set();
        facts.rejectedCountries.add(country);
      }
      // Current team rejection
      if (questionId.startsWith("current-team:")) {
        const team = questionId.replace("current-team:", "");
        if (!facts.rejectedTeams) facts.rejectedTeams = new Set();
        facts.rejectedTeams.add(team);
      }
      // Role rejections
      if (questionId === "batsman") { facts.notBatsman = true; }
      if (questionId === "bowler") { facts.notBowler = true; }
      if (questionId === "allrounder") { facts.notAllrounder = true; }
      if (questionId.startsWith("semantic:")) {
        if (!facts.rejectedSemanticTags) facts.rejectedSemanticTags = new Set();
        facts.rejectedSemanticTags.add(questionId.replace("semantic:", ""));
      }
    }
  }

  return facts;
}

/**
 * Check if a candidate question contradicts inferred facts.
 * Returns true if the question should be BLOCKED.
 */
export function isContradictory(questionOption, inferredFacts) {
  const id = questionOption.id;
  const category = questionOption.category;

  // ═══ NATIONALITY CONTRADICTIONS ═══
  
  // If we KNOW the player is Indian, block all overseas/foreign-country questions
  if (inferredFacts.indian === true) {
    if (id === "overseas") return true;
    if (id.startsWith("country:")) return true; // Any non-India country question
  }

  // If we KNOW the player is overseas, block "Is from India?" 
  if (inferredFacts.overseas === true) {
    if (id === "indian") return true;
  }

  // If we have a confirmed country, block all other country questions
  if (inferredFacts.confirmedCountry) {
    if (id.startsWith("country:") && id !== `country:${inferredFacts.confirmedCountry}`) return true;
    if (id === "indian" && inferredFacts.confirmedCountry !== "India") return true;
    if (id === "overseas" && inferredFacts.confirmedCountry === "India") return true;
  }

  // Block already-rejected countries
  if (inferredFacts.rejectedCountries instanceof Set) {
    if (id.startsWith("country:")) {
      const country = id.replace("country:", "");
      if (inferredFacts.rejectedCountries.has(country)) return true;
    }
  }

  // ═══ ROLE CONTRADICTIONS ═══
  
  // If confirmed as batsman, don't ask "Is he a bowler?"
  if (inferredFacts.confirmedRole === "batsman") {
    if (id === "bowler" || id === "allrounder") return true;
    if (id === "spinner" || id === "pacer" || id === "death-bowler" || id === "purple-cap") return true;
  }
  if (inferredFacts.confirmedRole === "bowler") {
    if (id === "batsman" || id === "allrounder") return true;
    if (id === "opener" || id === "middle-order" || id === "finisher" || id === "power-hitter" || id === "anchor" || id === "wicketkeeper") return true;
  }
  if (inferredFacts.confirmedRole === "wicketkeeper") {
    if (id === "bowler" || id === "spinner" || id === "pacer" || id === "death-bowler") return true;
  }

  // ═══ BOWLING TYPE CONTRADICTIONS ═══
  if (inferredFacts.confirmedBowlingType === "spin") {
    if (id === "pacer" || id === "death-bowler") return true;
  }
  if (inferredFacts.confirmedBowlingType === "pace") {
    if (id === "spinner") return true;
  }

  // ═══ BATTING POSITION CONTRADICTIONS ═══
  if (inferredFacts.confirmedBattingPos === "opener") {
    if (id === "middle-order" || id === "finisher") return true;
  }
  if (inferredFacts.confirmedBattingPos === "middle-order") {
    if (id === "opener") return true;
  }

  // ═══ CURRENT TEAM CONTRADICTIONS ═══
  if (inferredFacts.confirmedCurrentTeam) {
    if (id.startsWith("current-team:") && id !== `current-team:${inferredFacts.confirmedCurrentTeam}`) return true;
  }
  if (inferredFacts.rejectedTeams instanceof Set) {
    if (id.startsWith("current-team:")) {
      const team = id.replace("current-team:", "");
      if (inferredFacts.rejectedTeams.has(team)) return true;
    }
  }

  return false;
}

/**
 * Validate a guess candidate against inferred facts.
 * Returns a penalty multiplier (0.0 = impossible, 1.0 = fully valid).
 */
export function validateCandidateAgainstFacts(player, inferredFacts) {
  let penalty = 1.0;

  // Hard nationality contradiction
  if (inferredFacts.indian === true && player.overseas) return 0.01;
  if (inferredFacts.overseas === true && player.country === "India") return 0.01;
  if (inferredFacts.confirmedCountry && player.country !== inferredFacts.confirmedCountry) {
    return 0.01;
  }

  // Role contradiction
  if (inferredFacts.confirmedRole === "batsman" && player.role === "bowler") return 0.01;
  if (inferredFacts.confirmedRole === "bowler" && player.role === "batsman") return 0.01;
  if (inferredFacts.confirmedRole === "wicketkeeper" && !player.wicketKeeper && player.role !== "wicket-keeper") return 0.02;

  // Bowling type
  if (inferredFacts.confirmedBowlingType === "spin" && player.pacer && !player.spinner) penalty *= 0.05;
  if (inferredFacts.confirmedBowlingType === "pace" && player.spinner && !player.pacer) penalty *= 0.05;

  // Current team
  if (inferredFacts.confirmedCurrentTeam && player.currentTeam !== inferredFacts.confirmedCurrentTeam) {
    penalty *= 0.1;
  }

  // Era constraints (NEW: Prevent anachronistic guesses)
  if (inferredFacts.isVeteran && player.debutYear > 2015) penalty *= 0.01;
  if (inferredFacts.isRecentDebut && player.debutYear < 2020) penalty *= 0.01;
  if (inferredFacts.isFoundingEra && player.era !== "founding-era") penalty *= 0.05;
  if (inferredFacts.peakEra === "2011-2015" && player.dominantEra !== "2011-2015" && !player.historicalIPLLayer?.goldenEraPlayer) penalty *= 0.08;
  if (inferredFacts.peakEra === "2021-2026" && player.dominantEra !== "2021-2026" && !player.historicalIPLLayer?.post2020Player) penalty *= 0.08;
  if (inferredFacts.iplSpecialist && !player.questionAttributes?.IPLSpecialist) penalty *= 0.45;
  if (inferredFacts.journeyman && player.franchiseLoyalty !== "journeyman" && (player.teams?.length || 0) < 4) penalty *= 0.35;
  if (inferredFacts.obscureShortCareer && !["epic", "legendary", "legendary-obscure", "forgotten", "niche"].includes(player.obscurityProfile?.rarity || player.rarity)) penalty *= 0.5;

  const semanticTags = new Set([
    ...(player.dnaTags || []),
    ...(player.tacticalTags || []),
    ...(player.semanticVector || []),
    ...(player.playerDNA?.historicalTags || []),
    ...(player.playerDNA?.pressureTraits || []),
  ].map(normalizeTag));

  if (inferredFacts.confirmedSemanticTags instanceof Set) {
    for (const tag of inferredFacts.confirmedSemanticTags) {
      if (!semanticTags.has(normalizeTag(tag))) penalty *= 0.65;
    }
  }
  if (inferredFacts.rejectedSemanticTags instanceof Set) {
    for (const tag of inferredFacts.rejectedSemanticTags) {
      if (semanticTags.has(normalizeTag(tag))) penalty *= 0.55;
    }
  }

  return penalty;
}

function normalizeAnswer(answer) {
  const normalized = String(answer || "").toLowerCase().trim();
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return "neutral";
}

function normalizeTag(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
