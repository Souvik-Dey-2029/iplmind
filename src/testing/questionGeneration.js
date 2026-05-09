/**
 * Question Generation Testing Utility
 * Moved from production gemini.js to testing module.
 * Uses Gemini to generate questions for testing purposes only.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { sanitizePlayerForRender } from "@/lib/playerNormalizer";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * TESTING ONLY: Generates the next best question to ask during testing.
 * Takes remaining candidates and previous Q&A history,
 * and returns a question that maximally separates the candidate pool.
 * 
 * Not used in production gameplay - use questionEngine.selectBestQuestion instead.
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
