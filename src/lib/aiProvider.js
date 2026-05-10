/**
 * AI Provider
 * Uses OpenRouter API.
 */

import { sanitizePlayerForRender } from "./playerNormalizer";
import { logError, logWarn } from "./logger";

// Initialize providers
const geminiKey = process.env.GEMINI_API_KEY || "";
const openRouterKey = process.env.OPENROUTER_API_KEY || "";

// Provider Configurations
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_MODEL = "gemini-2.5-flash"; // Highly reliable, fast model
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = "google/gemini-2.0-flash-001"; // Fallback model

export const aiProviderMetrics = {
    geminiSuccesses: 0,
    geminiFailures: 0,
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

    if (provider === "gemini") {
        if (success) aiProviderMetrics.geminiSuccesses++;
        else aiProviderMetrics.geminiFailures++;
    } else if (provider === "openrouter") {
        if (success) aiProviderMetrics.openRouterSuccesses++;
        else aiProviderMetrics.openRouterFailures++;
    }

    if (!success) {
        logWarn("aiProvider", `Provider failure detected`, { provider, operation });
    }

    console.log(`[${timestamp}] ${status} ${provider.toUpperCase()} - ${operation}`);
}

async function callGemini(prompt, batchInfo = "") {
    if (!geminiKey) throw new Error("Gemini API key not configured");

    try {
        const response = await fetch(
            `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${geminiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
                }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || "Unknown"}`);
        }

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) throw new Error("No content in Gemini response");

        logProviderUsage("gemini", true, `generateContent ${batchInfo}`);
        return content.trim();
    } catch (error) {
        logProviderUsage("gemini", false, `generateContent ${batchInfo}`);
        throw error;
    }
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
 * Try AI providers with fallback and retry logic
 */
async function withFallback(operation, prompt, batchInfo = "", maxRetries = 2) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // Try Gemini first
        if (geminiKey) {
            try {
                return await callGemini(prompt, batchInfo);
            } catch (error) {
                lastError = error;
                console.warn(`Gemini attempt ${attempt} failed:`, error.message);
            }
        }

        // Fallback to OpenRouter
        if (openRouterKey) {
            aiProviderMetrics.fallbackCount++;
            try {
                return await callOpenRouter(prompt, batchInfo);
            } catch (error) {
                lastError = error;
                console.warn(`OpenRouter attempt ${attempt} failed:`, error.message);
            }
        }

        // Wait before retry
        if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }

    const errorMsg = `All AI providers failed after ${maxRetries} attempts. Last error: ${lastError?.message}`;
    logError("aiProvider", errorMsg, new Error(errorMsg), { operation, batchInfo });
    throw new Error(errorMsg);
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
 * Generate an adaptive, highly contextual question based on remaining candidates.
 * V4: FULL SEMANTIC DISAMBIGUATION ENGINE
 * Automatically switches modes based on candidate pool size to avoid generic questions late-game.
 */
export async function generateAdaptiveQuestion(candidates, previousQA, mode = "entropy") {
    if (!candidates || candidates.length === 0) return null;

    const qaContext = previousQA
        .map((qa, i) => `Q${i + 1}: ${qa.question} → ${qa.answer}`)
        .join("\n");

    const candidateProfiles = candidates.slice(0, Math.min(candidates.length, 12)).map(c => {
        const traits = [];
        if (c.role) traits.push(c.role);
        if (c.country) traits.push(c.country);
        if (c.currentTeam) traits.push(c.currentTeam);
        if (c.archetype) traits.push(c.archetype);
        if (c.playerDNA?.tacticalIdentity) traits.push(c.playerDNA.tacticalIdentity);
        if (c.era) traits.push(c.era);
        if (c.dominantEra) traits.push(`dominant-era:${c.dominantEra}`);
        if (c.strongestFranchiseAssociation) traits.push(`franchise-icon:${c.strongestFranchiseAssociation}`);
        if (c.obscurityProfile?.rarity) traits.push(`rarity:${c.obscurityProfile.rarity}`);
        if (c.opener) traits.push("opener");
        if (c.finisher) traits.push("finisher");
        if (c.wicketKeeper) traits.push("wicketkeeper");
        if (c.captain) traits.push("captain");
        if (c.spinner) traits.push("spinner");
        if (c.pacer) traits.push("pacer");
        if (c.leftHanded) traits.push("left-handed");
        if (c.overseas) traits.push("overseas");
        if (!c.active) traits.push("retired");
        if (c.iconic) traits.push("iconic");
        if (c.dnaTags?.length > 0) traits.push(...c.dnaTags.slice(0, 4));
        if (c.playerDNA?.pressureTraits?.length > 0) traits.push(...c.playerDNA.pressureTraits.slice(0, 2));
        if (c.obscurityProfile?.nicheIdentifiers?.length > 0) traits.push(...c.obscurityProfile.nicheIdentifiers.slice(0, 2));
        return `• ${c.name}: ${[...new Set(traits)].join(", ")}`;
    }).join("\n");

    let prompt = "";

    if (mode === "disambiguation") {
        prompt = `You are the deep reasoning engine of an IPL Akinator game. The candidate pool is extremely small (${candidates.length} players).
These players are highly semantically similar. You must find the SINGLE BIGGEST DIFFERENCE between them.

REMAINING CANDIDATES WITH DEEP TRAITS:
${candidateProfiles}

PREVIOUS Q&A (DO NOT ASK THESE AGAIN):
${qaContext}

RULES:
1. Return EXACTLY ONE simple yes/no question.
2. The question MUST perfectly split the top 2-3 candidates based on a specific, undeniable historical or statistical fact.
3. Focus on: Era differences, Franchise loyalty, Specific playstyles, Captaincy, or Cult status.
4. DO NOT ask generic questions. Ask deep differentiator questions.
5. Keep it under 15 words.

Example for Dhoni vs Pant: "Did this player captain a franchise to multiple IPL titles?"

Return ONLY the question text. Nothing else.`;

    } else if (mode === "verification") {
        const topCandidate = candidates[0];
        prompt = `You are the final verification engine of an IPL Akinator game. We are 95% sure the user is thinking of: ${topCandidate.name}.

TRAITS:
${candidateProfiles.split('\n')[0]}

PREVIOUS Q&A:
${qaContext}

Generate ONE high-certainty "silver bullet" verification question to confirm this is ${topCandidate.name}.
It should be about their most famous iconic trait, defining IPL moment, or unique identity.
Keep it under 15 words. Return ONLY the question text.`;

    } else {
        prompt = `You are the AI engine of an IPL cricket Akinator game. You must generate ONE question that BEST splits these ${candidates.length} remaining candidates into roughly equal groups.

REMAINING CANDIDATES WITH TRAITS:
${candidateProfiles}

PREVIOUS Q&A (do NOT repeat or contradict these):
${qaContext}

RULES:
1. Return EXACTLY ONE simple yes/no question
2. The question MUST split candidates roughly 50/50 based on their traits above
3. Max 14 words. Preferred 8-12 words
4. Do NOT ask about traits already confirmed/denied in previous Q&A
5. Focus on DIFFERENTIATING traits — find what splits the group best
6. Prefer semantic differentiators: era, franchise identity, IPL specialist, cult hero, finisher, pressure role, rarity

Return ONLY the question text. Nothing else.`;
    }

    try {
        const responseText = await withFallback("generateAdaptiveQuestion", prompt);
        return responseText.replace(/^["']|["']$/g, "").trim();
    } catch (error) {
        console.error("Generate adaptive question error:", error);
        logError("aiProvider", "generateAdaptiveQuestion failed", error);
        return null;
    }
}

/**
 * Automatically enrich missing metadata for a player when the AI fails to guess them.
 */
export async function generatePlayerMetadataEnrichment(playerName, questionHistory) {
    const qaContext = questionHistory
        .map((qa, i) => `Q${i + 1}: ${qa.question} → ${qa.answer}`)
        .join("\n");

    const prompt = `The AI failed to guess the IPL player: "${playerName}".
Based on the user's answers:
${qaContext}

Generate an enriched metadata profile for this player to improve future guessing. Provide a JSON object with:
- tags (array of strings, e.g., ["one-season-wonder", "uncapped", "PBKS"])
- role (string, e.g., "batsman", "bowler", "all-rounder")
- iconic_moment (string)
- era (string, e.g., "2008-2012")

Return ONLY the valid JSON object. No markdown formatting.`;

    try {
        const responseText = await withFallback("generatePlayerMetadataEnrichment", prompt);
        const cleaned = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error("Generate metadata enrichment error:", error);
        return null;
    }
}

export function getProviderStatus() {
    const totalGemini = aiProviderMetrics.geminiSuccesses + aiProviderMetrics.geminiFailures;
    const totalOpenRouter = aiProviderMetrics.openRouterSuccesses + aiProviderMetrics.openRouterFailures;

    return {
        gemini: {
            available: !!geminiKey,
            successes: aiProviderMetrics.geminiSuccesses,
            failures: aiProviderMetrics.geminiFailures,
            successRate: totalGemini > 0 ? (aiProviderMetrics.geminiSuccesses / totalGemini) * 100 : 0,
            total: totalGemini,
        },
        openRouter: {
            available: !!openRouterKey,
            successes: aiProviderMetrics.openRouterSuccesses,
            failures: aiProviderMetrics.openRouterFailures,
            successRate: totalOpenRouter > 0 ? (aiProviderMetrics.openRouterSuccesses / totalOpenRouter) * 100 : 0,
            total: totalOpenRouter,
        },
        fallbackCount: aiProviderMetrics.fallbackCount,
    };
}

/**
 * Reset metrics (useful for testing/monitoring)
 */
export function resetProviderMetrics() {
    aiProviderMetrics.geminiSuccesses = 0;
    aiProviderMetrics.geminiFailures = 0;
    aiProviderMetrics.openRouterSuccesses = 0;
    aiProviderMetrics.openRouterFailures = 0;
    aiProviderMetrics.fallbackCount = 0;
}
