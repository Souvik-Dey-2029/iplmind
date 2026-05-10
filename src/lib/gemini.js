/**
 * Gemini AI client - handles question evaluation and explanations.
 * NOTE: Production code uses aiProvider.js (two-layer Gemini + OpenRouter fallback).
 * This module is used by testing scripts.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizePlayerForRender } from "./playerNormalizer";

// Initialize Gemini with server-side API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/**
 * Generates the next best question to ask the user.
 * Takes remaining candidates and previous Q&A history,
 * and returns a question that maximally separates the candidate pool.
 * 
 * MOVED TO TESTING: src/testing/questionGeneration.js
 * Production code uses questionEngine.selectBestQuestion instead.
 */

/**
 * Uses AI to evaluate how each candidate matches a question+answer pair.
 * Returns a match score between 0 and 1 for each candidate.
 */
export async function evaluateCandidates(candidates, question, answer) {
  // Process in batches to avoid token limits
  const batchSize = 50;
  const allScores = {};

  for (let i = 0; i < candidates.length; i += batchSize) {
    const batch = candidates.slice(i, i + batchSize).map(sanitizePlayerForRender);
    const playerList = batch.map((p) => {
      return `${p.name}: ${p.country}, ${p.role}, ${p.battingStyle} bat, ${p.bowlingStyle} bowl, current_team=${p.latestSeasonTeam || p.currentTeam}, teams=[${p.teams.join(",")}], captain=${p.captain}, active=${p.active}, overseas=${p.overseas}, wicket_keeper=${p.wicketKeeper}, opener=${p.opener}, finisher=${p.finisher}, death_bowler=${p.deathBowler}, orange_cap=${p.orangeCap}, purple_cap=${p.purpleCap}, titles=${p.titlesWon}, power_hitter=${p.powerHitter}, anchor=${p.anchorBatter}, playoffs_hero=${p.playoffsHero}, iconic=${p.iconic}`;
    }).join("\n");

    const prompt = `You are evaluating IPL cricket players against a question and answer.

QUESTION: "${question}"
USER ANSWER: "${answer}"

PLAYERS:
${playerList}

For each player, rate how well they match the question+answer on a scale of 0.0 to 1.0:
- If answer is "Yes": 1.0 = definitely matches, 0.0 = definitely doesn't match
- If answer is "No": 1.0 = definitely doesn't match the question trait, 0.0 = definitely has the trait
- If answer is "Maybe": give 0.5 to all
- If answer is "Don't Know": give 0.5 to all (neutral, no change)

Return ONLY a JSON object mapping player names to scores. Example:
{"Virat Kohli": 0.9, "MS Dhoni": 0.1}

Important: Use exact player names as given. Return valid JSON only.`;

    try {
      if (!model) throw new Error("Gemini model not initialized");

      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Clean up markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const scores = JSON.parse(responseText);
      Object.assign(allScores, scores);
    } catch (error) {
      console.error("Evaluation error for batch:", error?.message);
      // Assign neutral scores on failure
      batch.forEach((p) => {
        allScores[p.name] = 0.5;
      });
    }
  }

  return allScores;
}

/**
 * Makes a final guess based on the top candidate.
 * Returns a confidence explanation from the AI.
 */
export async function generateGuessExplanation(player, previousQA) {
  const cleanPlayer = sanitizePlayerForRender(player);

  const qaContext = previousQA
    .map((qa, i) => `Q${i + 1}: ${qa.question} → ${qa.answer}`)
    .join("\n");

  const prompt = `Based on these questions and answers about an IPL player:

${qaContext}

I'm guessing the player is: ${cleanPlayer.name}

Write a brief, confident 1-2 sentence explanation of why this player matches all the clues. Do not mention unknown, missing, null, or unavailable metadata. Don't start with "Based on".`;

  try {
    if (!model) throw new Error("Gemini model not initialized");

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.warn("Failed to generate explanation from Gemini:", error?.message);

    // Fallback explanation based on player metadata
    const team = cleanPlayer.latestSeasonTeam || cleanPlayer.currentTeam || cleanPlayer.teams?.[cleanPlayer.teams.length - 1] || null;
    const parts = [cleanPlayer.role, cleanPlayer.country ? `from ${cleanPlayer.country}` : "", team ? `who played for ${team}` : ""];
    return `${cleanPlayer.name} - ${parts.filter(Boolean).join(" ")}.`;
  }
}
