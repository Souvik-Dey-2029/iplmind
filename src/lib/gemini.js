// Gemini AI client - handles all AI-powered question generation
import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizePlayerForRender } from "./playerNormalizer";

// Initialize Gemini with server-side API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * Generates the next best question to ask the user.
 * Takes remaining candidates and previous Q&A history,
 * and returns a question that maximally separates the candidate pool.
 */
export async function generateQuestion(candidates, previousQA, questionNumber) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build a summary of top candidate attributes for the AI
  const topCandidates = candidates.slice(0, 30).map(sanitizePlayerForRender);
  const candidateSummary = topCandidates.map((p) => {
    const facts = [p.country, p.role, p.latestSeasonTeam ? `latest team: ${p.latestSeasonTeam}` : ""].filter(Boolean);
    return `${p.name} (${facts.join(", ")}, ${p.active ? "active" : "retired"})`;
  }).join("\n");

  // Build previous Q&A context
  const qaContext = previousQA.length > 0
    ? previousQA.map((qa, i) => `Q${i + 1}: ${qa.question} → ${qa.answer}`).join("\n")
    : "No questions asked yet.";

  const prompt = `You are an expert IPL cricket analyst playing a guessing game. You need to identify which IPL player the user is thinking of.

REMAINING CANDIDATES (${candidates.length} total, showing top ${topCandidates.length}):
${candidateSummary}

PREVIOUS QUESTIONS AND ANSWERS:
${qaContext}

QUESTION NUMBER: ${questionNumber}

RULES:
- Ask ONE perfectly natural, simple yes/no question that splits the remaining candidates roughly 50/50.
- QUESTION STYLE: Must be short, direct, and conversational. Easy for a casual fan to answer instantly.
- DO NOT use multi-part questions, comparative reasoning, or overly long academic wording.
- BAD EXAMPLE: "Would you associate this player more with explosive batting than leadership?"
- GOOD EXAMPLE: "Is this player known for aggressive batting?"
- DO NOT repeat or rephrase any previously asked question (e.g. if you asked about Mumbai Indians, DO NOT ask about them again).
- IMPORTANT: Penalize repeated question categories heavily. If you have already asked about a team, ask about role, country, or traits.
- Focus on distinguishing features: nationality (overseas?), role (wicket-keeper?), handedness (left-handed?), era, achievements.
- Avoid obscure franchise history unless there is no other trait to split the remaining players on.
- Be specific and strategic. Maximum one idea or trait per question.
- DO NOT mention specific player names in the question.

QUESTION CATEGORIES TO CONSIDER (pick the most discriminating one):
- Nationality (Indian vs overseas, specific country)
- Role (batsman, bowler, all-rounder, wicket-keeper)
- Batting style (right-hand, left-hand, opener, middle-order, finisher)
- Bowling type (pace, spin, left-arm, right-arm, leg-spin, off-spin)
- Teams (specific IPL franchises)
- Era (early IPL 2008-2012, mid 2013-2017, modern 2018+)
- Achievements (captain, orange cap, purple cap, MVP, titles)
- Status (currently active or retired from IPL)

Return ONLY the question text, nothing else. No numbering, no prefix.`;

  try {
    const result = await model.generateContent(prompt);
    const question = result.response.text().trim();
    return question;
  } catch (error) {
    console.error("Gemini API error:", error);
    // Fallback questions if API fails
    const fallbacks = [
      "Is this player from India?",
      "Is this player primarily a batsman?",
      "Is this player currently active in the IPL?",
      "Has this player captained an IPL team?",
      "Is this player a fast bowler?",
      "Has this player won the Orange Cap?",
      "Is this player an opener?",
    ];
    return fallbacks[questionNumber - 1] || "Is this player well-known for their batting?";
  }
}

/**
 * Uses Gemini to evaluate how each candidate matches a question+answer pair.
 * Returns a match score between 0 and 1 for each candidate.
 */
export async function evaluateCandidates(candidates, question, answer) {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
      const result = await model.generateContent(prompt);
      let responseText = result.response.text().trim();

      // Clean up markdown code blocks if present
      responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      const scores = JSON.parse(responseText);
      Object.assign(allScores, scores);
    } catch (error) {
      console.error("Evaluation error for batch:", error);
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
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const cleanPlayer = sanitizePlayerForRender(player);

  const qaContext = previousQA
    .map((qa, i) => `Q${i + 1}: ${qa.question} → ${qa.answer}`)
    .join("\n");

  const prompt = `Based on these questions and answers about an IPL player:

${qaContext}

I'm guessing the player is: ${cleanPlayer.name}

Write a brief, confident 1-2 sentence explanation of why this player matches all the clues. Do not mention unknown, missing, null, or unavailable metadata. Don't start with "Based on".`;

  try {
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    const team = cleanPlayer.latestSeasonTeam || cleanPlayer.currentTeam || cleanPlayer.teams?.[cleanPlayer.teams.length - 1] || null;
    const parts = [cleanPlayer.role, cleanPlayer.country ? `from ${cleanPlayer.country}` : "", team ? `who played for ${team}` : ""];
    return `${cleanPlayer.name} - ${parts.filter(Boolean).join(" ")}.`;
  }
}
