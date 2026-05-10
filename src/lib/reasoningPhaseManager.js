/**
 * Reasoning Phase Manager
 * Manages the hierarchical flow of the Akinator game.
 * 
 * Phases:
 * 1. broad: General traits (role, indian/overseas, bowling type, batting style)
 * 2. refinement: Specific roles (captain, batting pos, wicketkeeper)
 * 3. precision: Specific teams, countries, niche traits
 */

export function determinePhase(candidatesLength, questionNumber) {
  if (questionNumber < 3 && candidatesLength > 30) return "broad";
  if (questionNumber < 7 && candidatesLength > 12) return "tactical";
  if (questionNumber < 11 && candidatesLength > 6) return "franchise";
  if (questionNumber < 16 && candidatesLength > 3) return "semantic";
  return "precision";
}

export function getAllowedCategories(phase) {
  switch (phase) {
    case "broad":
      return ["role", "origin-class", "bowling-style", "batting-style", "era"];
    case "tactical":
      return ["role", "origin-class", "bowling-style", "batting-style", "era", "batting-role", "bowling-role", "leadership", "profile", "semantic-dna"];
    case "franchise":
      return ["role", "origin-class", "era", "leadership", "batting-role", "bowling-role", "achievement", "profile", "semantic-dna", "current-team", "franchise-history"];
    case "semantic":
      return ["role", "origin-class", "bowling-style", "batting-style", "era", "leadership", "batting-role", "bowling-role", "achievement", "origin", "profile", "semantic-dna", "current-team", "franchise-history"];
    case "refinement":
      // Includes broad as fallback
      return ["role", "origin-class", "bowling-style", "batting-style", "era", "leadership", "batting-role", "bowling-role", "achievement", "profile", "semantic-dna"];
    case "precision":
      // All categories allowed
      return ["role", "origin-class", "bowling-style", "batting-style", "era", "leadership", "batting-role", "bowling-role", "achievement", "origin", "current-team", "franchise-history", "profile", "semantic-dna"];
    default:
      return ["role", "origin-class"];
  }
}

export function applyHierarchicalPenalties(option, phase, candidatesLength, history) {
  let penalty = 1.0;

  // 1. Team Question Rules (Phase 3 & 7)
  const isTeam = option.category === "current-team" || option.category === "franchise-history";
  if (isTeam) {
    if (phase !== "precision" && phase !== "franchise" && phase !== "semantic") {
      penalty *= 0.001; // Hard suppress team questions outside precision phase
    } else if (phase === "franchise" && candidatesLength <= 14) {
      penalty *= 1.35;
    } else if (candidatesLength > 5 && phase === "precision") {
      penalty *= 0.05; // Heavy penalty if still too many candidates
    }
  }

  // 2. Specific Country Rules (Phase 5 & 6)
  const isSpecificCountry = option.category === "origin" && option.id !== "overseas" && option.id !== "indian";
  if (isSpecificCountry) {
    if (phase === "broad") {
      penalty *= 0.001; // No specific countries in broad phase
    }
    
    // Category Exhaustion / Cooldown
    const recentCategories = history.slice(-3).map(h => h.category);
    const countryQuestionsInRecent = recentCategories.filter(c => c === "origin").length;
    if (countryQuestionsInRecent > 0) {
      penalty *= 0.1; // Massive cooldown on guessing multiple countries in a row
    }
  }

  // 3. Category Exhaustion (General)
  const categoryCount = history.filter(h => h.category === option.category).length;
  if (categoryCount >= 2 && option.category !== "franchise-history" && option.category !== "origin") {
    penalty *= 0.5;
  }

  if (option.category === "semantic-dna") {
    if (phase === "broad") penalty *= 0.05;
    if (phase === "semantic" || phase === "precision") penalty *= 1.25;
    const recentSemanticQuestions = history.slice(-3).filter(h => h.category === "semantic-dna").length;
    if (recentSemanticQuestions > 0) penalty *= 0.45;
  }

  return penalty;
}
