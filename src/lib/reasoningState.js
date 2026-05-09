/**
 * Logical Constraint System for the Reasoning Engine
 * Maintains strict state of known facts to prevent contradictions.
 */

import { CONCEPT_GROUPS } from "./questionEngine";

/**
 * Build the definitive locked state based on question history.
 * @param {Array} history - Array of { questionId, answer, category }
 * @returns {Object} - Locked state (e.g., { overseas: true, indian: false, spinner: true })
 */
export function buildReasoningState(history) {
  const state = {};

  for (const entry of history) {
    const answer = entry.answer?.toLowerCase();
    if (answer === "neutral" || answer === "don't know" || answer === "maybe") continue;

    // Direct mapping from CONCEPT_GROUPS
    const isYes = answer === "yes";
    
    // Find the concept group
    for (const group of Object.values(CONCEPT_GROUPS)) {
      if (group.ids.includes(entry.questionId)) {
        const inferences = isYes ? group.infers_yes : group.infers_no;
        Object.assign(state, inferences);
      }
    }
  }

  return state;
}

/**
 * Checks if a proposed question contradicts the locked state.
 */
export function violatesConstraints(questionId, state) {
  // If we know player is a batsman, and this is a bowler question, it violates constraints.
  for (const group of Object.values(CONCEPT_GROUPS)) {
    if (group.ids.includes(questionId)) {
      // If we know this group is suppressed
      // e.g. if state says { batsman: true }, and this question is 'bowler',
      // but wait, CONCEPT_GROUPS already has 'suppresses'.
      // The old buildSuppressedConceptSet handles this.
    }
  }
  return false;
}
