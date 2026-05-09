/**
 * Personality Modes - Alter AI communication style without changing logic.
 * Lightweight presentation layer for game flavor.
 * Supports: Analyst, Commentator, Meme, Gen-Z Fan
 */

export const PERSONALITY_MODES = {
    ANALYST: "analyst",
    COMMENTATOR: "commentator",
    MEME: "meme",
    GENZ: "gen-z",
};

/**
 * Transform a guess explanation based on personality mode.
 */
export function getPersonalityGuessPhrase(playerName, confidence, mode = PERSONALITY_MODES.ANALYST) {
    const phrases = {
        analyst: {
            high: `My analysis indicates ${playerName}. Confidence level: ${confidence}%. The probabilistic model heavily favors this candidate.`,
            medium: `Based on statistical inference, ${playerName} is the most probable match. Confidence: ${confidence}%.`,
            low: `The data suggests ${playerName}, though with moderate uncertainty. Confidence: ${confidence}%.`,
        },
        commentator: {
            high: `AND THAT'S IT! It's ${playerName}! The crowd goes wild! I'm absolutely certain - ${confidence}% confident!`,
            medium: `Ladies and gentlemen, I believe it's ${playerName}! A solid ${confidence}% confidence in this prediction!`,
            low: `Could it be... ${playerName}? I think so, but there's some doubt. ${confidence}% confident.`,
        },
        meme: {
            high: `💯 It's ${playerName}. No cap. ${confidence}% sure fr fr. Facts. 🔥`,
            medium: `Bro it's gotta be ${playerName}. Like... ${confidence}% sure? Probably? 🤔`,
            low: `Umm... maybe ${playerName}? Like ${confidence}% confident ngl 👉👈`,
        },
        "gen-z": {
            high: `bestie it IS ${playerName} and i'm living for this ${confidence}% energy ✨`,
            medium: `okay so like... ${playerName}? ${confidence}% sure and that's the tea ☕`,
            low: `idk idk might be ${playerName}??? like ${confidence}% vibes??? so random 💅`,
        },
    };

    const confidenceLevel = confidence >= 75 ? "high" : confidence >= 50 ? "medium" : "low";
    const modePhrase = phrases[mode] || phrases.analyst;

    return modePhrase[confidenceLevel] || modePhrase.medium;
}

/**
 * Transform reasoning factors based on personality.
 */
export function getPersonalityReasoningFactors(factors = [], mode = PERSONALITY_MODES.ANALYST) {
    const transformations = {
        analyst: (factors) => factors,
        commentator: (factors) =>
            factors.map((f) => `🎙️ ${f}`).slice(0, 3),
        meme: (factors) =>
            factors.map((f) => `✅ ${f}`).slice(0, 3),
        "gen-z": (factors) =>
            factors.map((f) => `⚡ ${f}`).slice(0, 3),
    };

    const transform = transformations[mode] || transformations.analyst;
    return transform(factors);
}

/**
 * Transform thinking stage messages based on personality.
 */
export function getPersonalityThinkingMessage(
    stage = "analyzing",
    mode = PERSONALITY_MODES.ANALYST
) {
    const stages = {
        analyst: {
            analyzing: "Analyzing batting metrics...",
            filtering: "Cross-referencing team history...",
            reducing: "Applying probabilistic constraints...",
            evaluating: "Evaluating leadership patterns...",
            finalizing: "Computing final inference...",
        },
        commentator: {
            analyzing: "🎙️ Examining the player profile...",
            filtering: "🏟️ Looking at franchise history...",
            reducing: "⚡ Narrowing down the field...",
            evaluating: "👑 Checking captaincy credentials...",
            finalizing: "🏆 Making the final call...",
        },
        meme: {
            analyzing: "📊 big brain time...",
            filtering: "🧠 scrolling through team records...",
            reducing: "🔪 cutting the list...",
            evaluating: "🎭 vibes check...",
            finalizing: "🎯 big reveal incoming...",
        },
        "gen-z": {
            analyzing: "bestie let me analyze... ✨",
            filtering: "looking thru the archive slay 💁",
            reducing: "cutting the weak ones out 💅",
            evaluating: "checking their leader energy 👑",
            finalizing: "okay bestie its time 🌟",
        },
    };

    const modeStages = stages[mode] || stages.analyst;
    return modeStages[stage] || modeStages.analyzing;
}

/**
 * Transform post-game summary tone based on personality.
 */
export function getPersonalityPostGameMessage(correct, mode = PERSONALITY_MODES.ANALYST) {
    const messages = {
        analyst: {
            correct: "Inference successful. Model validation: positive.",
            incorrect: "Inference model requires recalibration. Edge case encountered.",
        },
        commentator: {
            correct: "YES! What a prediction! The model came through! 🎉",
            incorrect: "Tough break! Even the best analysts get stumped sometimes. Next time! 🎙️",
        },
        meme: {
            correct: "slay i was right 💅 model supremacy 🔥",
            incorrect: "oof that was not it chief 😭 we'll get em next time 🤡",
        },
        "gen-z": {
            correct: "no way bestie we actually DID THAT 🎉✨✨",
            incorrect: "okay that one didn't hit but like... no worries babe 💕",
        },
    };

    const modeMessages = messages[mode] || messages.analyst;
    return correct ? modeMessages.correct : modeMessages.incorrect;
}

/**
 * Get personality description for UI display.
 */
export function getPersonalityDescription(mode = PERSONALITY_MODES.ANALYST) {
    const descriptions = {
        analyst: {
            name: "Cricket Analyst",
            emoji: "📊",
            desc: "Statistical rigor and probabilistic reasoning",
        },
        commentator: {
            name: "Hype Commentator",
            emoji: "🎙️",
            desc: "High-energy stadium vibes and dramatic flair",
        },
        meme: {
            name: "Meme Mode",
            emoji: "🔥",
            desc: "Internet humor and casual takes",
        },
        "gen-z": {
            name: "Gen-Z Fan",
            emoji: "✨",
            desc: "Modern slang and vibe-oriented predictions",
        },
    };

    return descriptions[mode] || descriptions.analyst;
}

/**
 * Transform confidence message based on personality and threshold.
 */
export function getPersonalityConfidenceMessage(confidence, mode = PERSONALITY_MODES.ANALYST) {
    const messages = {
        analyst: {
            veryHigh: `Bayesian confidence: ${confidence}%`,
            high: `Statistical confidence: ${confidence}%`,
            medium: `Moderate confidence: ${confidence}%`,
            low: `Low confidence: ${confidence}%`,
        },
        commentator: {
            veryHigh: `${confidence}%!! I'm CERTAIN!!`,
            high: `${confidence}% - strong prediction!`,
            medium: `${confidence}% - could go either way`,
            low: `${confidence}% - barely above 50-50`,
        },
        meme: {
            veryHigh: `${confidence}% slay energy 💯`,
            high: `${confidence}% hits different 🔥`,
            medium: `${confidence}% maybe? 🤷`,
            low: `${confidence}% yikes... 😬`,
        },
        "gen-z": {
            veryHigh: `${confidence}% no cap bestie ✨`,
            high: `${confidence}% and that's the vibe 💅`,
            medium: `${confidence}% like... idk maybe? 👉👈`,
            low: `${confidence}% but like lowkey scared 😅`,
        },
    };

    const modeMessages = messages[mode] || messages.analyst;
    let level = "low";
    if (confidence >= 80) level = "veryHigh";
    else if (confidence >= 65) level = "high";
    else if (confidence >= 50) level = "medium";

    return modeMessages[level];
}

/**
 * Apply personality transformations to entire response.
 */
export function applyPersonality(data, mode = PERSONALITY_MODES.ANALYST) {
    if (!data) return data;

    return {
        ...data,
        guessPhrase: getPersonalityGuessPhrase(data.playerName, data.confidence, mode),
        reasoningFactors: getPersonalityReasoningFactors(data.reasoningFactors || [], mode),
        confidenceMessage: getPersonalityConfidenceMessage(data.confidence, mode),
        postGameMessage: data.wasCorrect
            ? getPersonalityPostGameMessage(true, mode)
            : getPersonalityPostGameMessage(false, mode),
    };
}

/**
 * Get a list of all available personality modes for UI picker.
 */
export function getAvailablePersonalities() {
    return [
        PERSONALITY_MODES.ANALYST,
        PERSONALITY_MODES.COMMENTATOR,
        PERSONALITY_MODES.MEME,
        PERSONALITY_MODES.GENZ,
    ].map((mode) => getPersonalityDescription(mode));
}
