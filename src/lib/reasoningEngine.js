/**
 * Reasoning Engine - Explainable AI for IPLMind
 * Generates intelligible explanations for why the AI makes specific guesses.
 * Provides reasoning factors, matched traits, confidence explanations.
 */

import { getRankedPlayers } from "@/lib/probabilityEngine";

/**
 * Calculate information gain - how much this question reduces uncertainty.
 * Higher value = more useful question
 */
export function calculateInformationGain(currentCandidates, answerImpact) {
    if (!currentCandidates || currentCandidates.length <= 1) return 0;

    const beforeEntropy = Math.log2(currentCandidates.length);
    const expectedReduction = answerImpact * 0.3; // Normalized impact
    return beforeEntropy * expectedReduction;
}

/**
 * Generate reasoning factors explaining why a player guess is made.
 * Returns: { topFactors: string[], matchedTraits: object, explanations: object }
 */
export function generateReasoningFactors(
    topPlayer,
    allPlayers,
    questionHistory = [],
    probabilities = {}
) {
    if (!topPlayer || !allPlayers) {
        return {
            topFactors: ["Insufficient data for reasoning"],
            matchedTraits: {},
            explanations: { confidence: "Data incomplete" },
        };
    }

    const playerData = allPlayers.find((p) => p.name === topPlayer.name);
    if (!playerData) {
        return {
            topFactors: ["Player data not found"],
            matchedTraits: {},
            explanations: { confidence: "No player profile" },
        };
    }

    const factors = extractTopFactors(playerData, questionHistory, probabilities);
    const traits = extractMatchedTraits(playerData, questionHistory);
    const explanations = generateExplanations(topPlayer.confidence, questionHistory.length, allPlayers.length);

    return {
        topFactors: factors,
        matchedTraits: traits,
        explanations,
    };
}

/**
 * Extract top 3-5 distinguishing factors about a player.
 */
function extractTopFactors(playerData, questionHistory, probabilities) {
    const factors = [];

    // Factor 1: Batting role/position
    if (playerData.primaryBattingPosition) {
        factors.push(`${playerData.primaryBattingPosition} batter`);
    } else if (playerData.role) {
        factors.push(`${playerData.role}`);
    }

    // Factor 2: Franchise tenure (current team if available)
    if (playerData.teams && playerData.teams.length > 0) {
        const currentTeam = playerData.teams[playerData.teams.length - 1];
        factors.push(`Long-term ${currentTeam} player`);
    }

    // Factor 3: Batting style
    if (playerData.battingStyle && playerData.battingStyle !== "Right-handed") {
        factors.push(`${playerData.battingStyle} batting style`);
    }

    // Factor 4: Playing role
    if (playerData.role && playerData.role !== "Batsman") {
        factors.push(`${playerData.role}`);
    }

    // Factor 5: Experience level (rough estimate from answersCount)
    if (playerData.answersCount && playerData.answersCount > 50) {
        factors.push("High-profile IPL veteran");
    }

    // Limit to top 4 factors for clarity
    return factors.slice(0, 4).filter((f) => f && f.length > 0);
}

/**
 * Extract traits that matched during inference.
 * Returns object with trait categories and matched values.
 */
function extractMatchedTraits(playerData, questionHistory) {
    const traits = {};

    // Accumulate trait matches from question history
    questionHistory.forEach((entry) => {
        const { question, answer } = entry;
        if (!question || !answer) return;

        const qText = (question.text || "").toLowerCase();

        // Batting traits
        if (qText.includes("bat") && !traits.batting) {
            traits.batting = playerData.primaryBattingPosition || "Unknown";
        }

        // Team traits
        if ((qText.includes("team") || qText.includes("franchise")) && !traits.team) {
            traits.team = playerData.teams?.[playerData.teams.length - 1] || "Unknown";
        }

        // Role traits
        if (qText.includes("role") && !traits.role) {
            traits.role = playerData.role || "All-rounder";
        }

        // Hand traits
        if (qText.includes("hand") && !traits.hand) {
            traits.hand = playerData.battingStyle || "Right-handed";
        }
    });

    // Add default traits if none found
    if (Object.keys(traits).length === 0) {
        traits.default = "Matched through inference";
    }

    return traits;
}

/**
 * Generate confidence explanations based on game progression.
 */
function generateExplanations(confidence, questionsAsked, totalCandidates) {
    const explanations = {};

    // Confidence explanation
    if (confidence >= 80) {
        explanations.confidence = "Very high certainty - almost certain this is the player";
    } else if (confidence >= 65) {
        explanations.confidence = "High confidence - most likely this player";
    } else if (confidence >= 50) {
        explanations.confidence = "Moderate confidence - likely but not certain";
    } else if (confidence >= 35) {
        explanations.confidence = "Lower confidence - possible but needs verification";
    } else {
        explanations.confidence = "Low confidence - narrow elimination process";
    }

    // Efficiency explanation
    const reductionRate = ((totalCandidates - 1) / Math.max(questionsAsked, 1)).toFixed(1);
    explanations.efficiency = `Narrowed ${totalCandidates} players to 1 in ${questionsAsked} questions`;

    // Process explanation
    if (questionsAsked < 5) {
        explanations.process = "Quick inference through key distinguishing features";
    } else if (questionsAsked < 10) {
        explanations.process = "Methodical narrowing through multiple trait matches";
    } else {
        explanations.process = "Thorough elimination of candidates across all traits";
    }

    return explanations;
}

/**
 * Rank questions by information gain / utility.
 * Returns questions sorted by estimated usefulness.
 */
export function rankQuestionsByGain(questions, candidates, previousQuestions = []) {
    if (!questions || questions.length === 0) return [];

    const ranked = questions.map((q) => {
        let gain = 1.0; // Base gain

        // Boost questions about primary distinguishers
        const qText = (q.text || "").toLowerCase();
        if (qText.includes("team") || qText.includes("franchise")) gain *= 1.3;
        if (qText.includes("role") || qText.includes("position")) gain *= 1.2;
        if (qText.includes("captain")) gain *= 1.15;
        if (qText.includes("international")) gain *= 0.8;

        // Penalize questions we've already asked (avoid loops)
        const categoryCount = previousQuestions.filter((pq) =>
            (pq.category || "") === (q.category || "")
        ).length;
        if (categoryCount > 2) gain *= 0.5;

        // Reduce gain for very similar questions
        const similarity = previousQuestions.filter((pq) => {
            const prevText = (pq.text || "").toLowerCase();
            const currText = qText;
            return prevText.includes(currText.split(" ")[0]) ||
                currText.includes(prevText.split(" ")[0]);
        }).length;
        if (similarity > 1) gain *= 0.6;

        return { ...q, informationGain: gain };
    });

    return ranked.sort((a, b) => (b.informationGain || 0) - (a.informationGain || 0));
}

/**
 * Analyze confidence evolution during game.
 * Returns { trend: 'improving'|'stable'|'uncertain', milestones: object[] }
 */
export function analyzeConfidenceEvolution(confidenceHistory = []) {
    if (!confidenceHistory || confidenceHistory.length < 2) {
        return { trend: "uncertain", milestones: [], averageConfidence: 0 };
    }

    const recent = confidenceHistory.slice(-3);
    const earlier = confidenceHistory.slice(0, Math.max(1, Math.floor(confidenceHistory.length / 2)));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;

    let trend = "stable";
    if (recentAvg > earlierAvg + 5) trend = "improving";
    if (recentAvg < earlierAvg - 5) trend = "uncertain";

    // Find confidence milestones (crossover points)
    const milestones = [];
    for (let i = 1; i < confidenceHistory.length; i++) {
        if (confidenceHistory[i] >= 50 && confidenceHistory[i - 1] < 50) {
            milestones.push({ question: i, event: "reached_threshold", confidence: confidenceHistory[i] });
        }
        if (confidenceHistory[i] >= 65 && confidenceHistory[i - 1] < 65) {
            milestones.push({ question: i, event: "high_confidence", confidence: confidenceHistory[i] });
        }
    }

    return {
        trend,
        milestones,
        averageConfidence: (confidenceHistory.reduce((a, b) => a + b, 0) / confidenceHistory.length).toFixed(1),
        finalConfidence: confidenceHistory[confidenceHistory.length - 1],
    };
}

/**
 * Generate post-game summary of inference process.
 * Returns detailed analysis of how guess was made.
 */
export function generatePostGameSummary(
    guessedPlayer,
    correctPlayer,
    gameStats = {}
) {
    const summary = {
        guess: guessedPlayer,
        correct: correctPlayer,
        accuracy: guessedPlayer === correctPlayer,
        questionsAsked: gameStats.questionsAsked || 0,
        confidenceReached: gameStats.confidenceReached || 0,
        candidatesEliminated: gameStats.totalCandidates - 1 || 0,
        topRejectedCandidates: gameStats.topRejected || [],
        inferenceEfficiency: generateEfficiencyMetric(gameStats),
        reasoningPath: generateReasoningPath(gameStats),
    };

    return summary;
}

/**
 * Calculate inference efficiency score (lower is better).
 */
function generateEfficiencyMetric(gameStats) {
    const { questionsAsked = 10, totalCandidates = 250 } = gameStats;
    const theoretical = Math.log2(totalCandidates); // Theoretical minimum
    const actual = questionsAsked;
    const efficiency = (theoretical / actual * 100).toFixed(1);

    return {
        theoretical: theoretical.toFixed(2),
        actual,
        efficiency: `${efficiency}%`,
        rating: efficiency >= 50 ? "Excellent" : efficiency >= 30 ? "Very Good" : efficiency >= 20 ? "Good" : "Fair",
    };
}

/**
 * Trace the inference logic path.
 */
function generateReasoningPath(gameStats) {
    const { questionsAsked = 0, confidenceHistory = [] } = gameStats;

    const milestones = [];
    if (questionsAsked >= 1) milestones.push("1️⃣ Initial guess based on probabilities");
    if (questionsAsked >= 3) milestones.push("2️⃣ Confidence reached 40+ threshold");
    if (questionsAsked >= 5) milestones.push("3️⃣ Top candidate narrowed to <10 candidates");
    if (questionsAsked >= 8) milestones.push("4️⃣ High confidence (65%+) achieved");
    if (questionsAsked >= 10) milestones.push("5️⃣ Final guess with high certainty");

    return {
        stepsCount: Math.min(questionsAsked, 5),
        milestones,
        totalPath: `${questionsAsked} questions → confidence analysis → final inference`,
    };
}

/**
 * Get top rejected candidates (nearly-guessed players).
 */
export function getTopRejectedCandidates(probabilities = {}, topPlayer, count = 3) {
    if (!probabilities || !topPlayer) return [];

    const ranked = getRankedPlayers(probabilities);
    // Get runners-up (skip the top player)
    return ranked
        .filter((p) => p.name !== topPlayer.name)
        .slice(0, count)
        .map((p) => ({
            name: p.name,
            probability: (p.probability * 100).toFixed(1),
            almostWrongBy: (
                (probabilities[topPlayer.name] - p.probability) *
                100
            ).toFixed(1),
        }));
}
