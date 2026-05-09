/**
 * AI Provider
 * Uses OpenRouter API.
 */

import { sanitizePlayerForRender } from "./playerNormalizer";
import { logError, logWarn } from "./logger";

// Initialize providers
const openRouterKey = process.env.OPENROUTER_API_KEY || "";

// OpenRouter configuration
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001"; // OpenRouter's endpoint

/**
 * AI Provider Status and Metrics
 */
export const aiProviderMetrics = {
    openRouterSuccesses: 0,
    openRouterFailures: 0,
    fallbackCount: 0,
};

/**
 * Logs provider usage for monitoring
 */
function logProviderUsage(provider, success, operation) {
    const timestamp = new Date().toISOString();
    const status = success ? "✅" : "❌";

    if (provider === "openrouter") {
        if (success) {
            aiProviderMetrics.openRouterSuccesses++;
        } else {
            aiProviderMetrics.openRouterFailures++;
        }

        if (!success && aiProviderMetrics.openRouterFailures === 1) {
            logWarn("aiProvider", `First ${provider} failure detected`, { operation });
        }
    }

    console.log(
        `[${timestamp}] ${status} ${provider.toUpperCase()} - ${operation}`
    );
}

/**
 * Call OpenRouter API with error handling
 */
async function callOpenRouter(prompt, batchInfo = "") {
    if (!openRouterKey) {
        throw new Error("OpenRouter API key not configured");
    }

    try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${openRouterKey}`,
                "HTTP-Referer": "https://iplmind.app", // Optional but recommended
                "X-Title": "IPLMind",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: OPENROUTER_MODEL,
                messages: [
                    {
                        role: "user",
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 2000,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
                `OpenRouter API error: ${response.status} - ${errorData.error?.message || "Unknown error"}`
            );
        }

        const data = await response.json();
        const content =
            data.choices?.[0]?.message?.content || "";

        if (!content) {
            throw new Error("No content in OpenRouter response");
        }

        logProviderUsage("openrouter", true, `chat/completions ${batchInfo}`);
        return content.trim();
    } catch (error) {
        logProviderUsage("openrouter", false, `chat/completions ${batchInfo}`);
        throw error;
    }
}

/**
 * Try AI provider
 */
async function withFallback(
    operation,
    prompt,
    batchInfo = ""
) {
    try {
        return await callOpenRouter(prompt, batchInfo);
    } catch (error) {
        const errorMsg = `AI provider failed - OpenRouter: ${error.message}`;
        logError("aiProvider", errorMsg, new Error(errorMsg), {
            operation,
            error: error.message,
        });
        throw new Error(errorMsg);
    }
}

/**
 * Evaluate candidates.
 */
export async function evaluateCandidates(candidates, question, answer) {
    const batchSize = 50;
    const allScores = {};

    for (let i = 0; i < candidates.length; i += batchSize) {
        const batch = candidates.slice(i, i + batchSize).map(sanitizePlayerForRender);
        const playerList = batch
            .map((p) => {
                return `${p.name}: ${p.country}, ${p.role}, ${p.battingStyle} bat, ${p.bowlingStyle} bowl, current_team=${p.latestSeasonTeam || p.currentTeam}, teams=[${p.teams.join(",")}], captain=${p.captain}, active=${p.active}, overseas=${p.overseas}, wicket_keeper=${p.wicketKeeper}, opener=${p.opener}, finisher=${p.finisher}, death_bowler=${p.deathBowler}, orange_cap=${p.orangeCap}, purple_cap=${p.purpleCap}, titles=${p.titlesWon}, power_hitter=${p.powerHitter}, anchor=${p.anchorBatter}, playoffs_hero=${p.playoffsHero}, iconic=${p.iconic}`;
            })
            .join("\n");

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
            const responseText = await withFallback(
                "evaluateCandidates",
                prompt,
                `batch ${Math.floor(i / batchSize) + 1}`
            );

            // Clean up markdown code blocks if present
            const cleaned = responseText
                .replace(/```json\n?/g, "")
                .replace(/```\n?/g, "")
                .trim();

            const scores = JSON.parse(cleaned);
            Object.assign(allScores, scores);
        } catch (error) {
            console.error("Evaluation error for batch:", error);
            logError("aiProvider", "evaluateCandidates batch failed", error, {
                batchNumber: Math.floor(i / batchSize) + 1,
                batchSize: batch.length,
            });

            // Assign neutral scores on failure
            batch.forEach((p) => {
                allScores[p.name] = 0.5;
            });
        }
    }

    return allScores;
}

/**
 * Generate guess explanation.
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
        return await withFallback("generateGuessExplanation", prompt);
    } catch (error) {
        console.error("Generate explanation error:", error);
        logError("aiProvider", "generateGuessExplanation failed", error, {
            playerName: cleanPlayer.name,
        });

        // Fallback to template-based explanation
        const team =
            cleanPlayer.latestSeasonTeam ||
            cleanPlayer.currentTeam ||
            cleanPlayer.teams?.[cleanPlayer.teams.length - 1] ||
            null;
        const parts = [
            cleanPlayer.role,
            cleanPlayer.country ? `from ${cleanPlayer.country}` : "",
            team ? `who played for ${team}` : "",
        ];
        return `${cleanPlayer.name} - ${parts.filter(Boolean).join(" ")}.`;
    }
}

/**
 * Get provider status and metrics for monitoring
 */
export function getProviderStatus() {
    const totalOpenRouter =
        aiProviderMetrics.openRouterSuccesses + aiProviderMetrics.openRouterFailures;

    return {
        openRouter: {
            available: !!openRouterKey,
            successes: aiProviderMetrics.openRouterSuccesses,
            failures: aiProviderMetrics.openRouterFailures,
            successRate:
                totalOpenRouter > 0
                    ? (aiProviderMetrics.openRouterSuccesses / totalOpenRouter) * 100
                    : 0,
            total: totalOpenRouter,
        },
        fallbackCount: aiProviderMetrics.fallbackCount,
    };
}

/**
 * Reset metrics (useful for testing/monitoring)
 */
export function resetProviderMetrics() {
    aiProviderMetrics.openRouterSuccesses = 0;
    aiProviderMetrics.openRouterFailures = 0;
    aiProviderMetrics.fallbackCount = 0;
}
