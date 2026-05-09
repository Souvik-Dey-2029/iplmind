/**
 * Multi-Language Support - English, Hindi, Hinglish
 * Centralized text configuration for IPLMind
 * Preserves personality modes across all languages
 */

export const LANGUAGES = {
    ENGLISH: "english",
    HINDI: "hindi",
    HINGLISH: "hinglish",
};

// Centralized text strings - expandable per language
export const STRINGS = {
    english: {
        // Game UI
        title: "IPLMind",
        subtitle: "Think of an IPL player.",
        description:
            "I will keep asking high-signal yes/no questions until the read is strong enough.",
        startGame: "Start Game",
        restartGame: "Restart Game",

        // Game Phase
        question: "Question",
        candidatesRemaining: "candidates still alive",
        currentRead: "Current Read",
        myGuess: "My Guess",

        // Answers
        yes: "Yes",
        no: "No",
        maybe: "Maybe",
        dontKnow: "Don't Know",

        // Guess feedback
        correct: "Correct!",
        incorrect: "Who was it?",

        // Confidence
        confidence: "Confidence",
        confidenceVeryHigh: "Very high certainty - almost certain this is the player",
        confidenceHigh: "High confidence - most likely this player",
        confidenceMedium: "Moderate confidence - likely but not certain",
        confidenceLow: "Lower confidence - possible but needs verification",

        // Reasoning
        topReasoningFactors: "Top Reasoning Factors",
        efficiency: "Efficiency",
        process: "Process",

        // Post Game
        postGameTitle: "Game Over!",
        questionsAsked: "Questions Asked",
        inferenceEfficiency: "Inference Efficiency",
        topRejected: "Top Rejected Candidates",

        // Voice
        listenMode: "Listening...",
        speakAnswer: "Speak Your Answer",
        voiceNotSupported: "Voice not supported in this browser",

        // Thinking
        analyzing: "Analyzing...",
        filtering: "Filtering...",
        reducing: "Reducing...",
        evaluating: "Evaluating...",
    },

    hindi: {
        // Game UI
        title: "आईपीएलमाइंड",
        subtitle: "एक IPL खिलाड़ी के बारे में सोचें।",
        description:
            "मैं तब तक हाँ/नहीं प्रश्न पूछता रहूंगा जब तक पढ़ना मजबूत न हो जाए।",
        startGame: "गेम शुरू करें",
        restartGame: "गेम दोबारा शुरू करें",

        // Game Phase
        question: "प्रश्न",
        candidatesRemaining: "खिलाड़ी अभी भी हैं",
        currentRead: "वर्तमान रीड",
        myGuess: "मेरा अनुमान",

        // Answers
        yes: "हाँ",
        no: "नहीं",
        maybe: "हो सकता है",
        dontKnow: "नहीं पता",

        // Guess feedback
        correct: "सही है!",
        incorrect: "यह कौन था?",

        // Confidence
        confidence: "आत्मविश्वास",
        confidenceVeryHigh: "बहुत अधिक निश्चितता",
        confidenceHigh: "उच्च आत्मविश्वास",
        confidenceMedium: "मध्यम आत्मविश्वास",
        confidenceLow: "कम आत्मविश्वास",

        // Reasoning
        topReasoningFactors: "शीर्ष कारण",
        efficiency: "दक्षता",
        process: "प्रक्रिया",

        // Post Game
        postGameTitle: "खेल खत्म!",
        questionsAsked: "प्रश्न पूछे गए",
        inferenceEfficiency: "अनुमान दक्षता",
        topRejected: "अस्वीकृत खिलाड़ी",

        // Voice
        listenMode: "सुन रहा हूँ...",
        speakAnswer: "अपना उत्तर बोलें",
        voiceNotSupported: "इस ब्राउज़र में वॉइस समर्थित नहीं है",

        // Thinking
        analyzing: "विश्लेषण जारी...",
        filtering: "फ़िल्टर जारी...",
        reducing: "कम जारी...",
        evaluating: "मूल्यांकन जारी...",
    },

    hinglish: {
        // Game UI
        title: "IPLMind",
        subtitle: "Ek IPL player ke baare mein socho.",
        description:
            "Main tab tak haan/nahi questions poochunga jab tak reading strong na ho jaye.",
        startGame: "Game Shuru Karo",
        restartGame: "Game Dobara Shuru Karo",

        // Game Phase
        question: "Question",
        candidatesRemaining: "players abhi remaining hain",
        currentRead: "Current Read",
        myGuess: "Mera Guess",

        // Answers
        yes: "Haan",
        no: "Nahi",
        maybe: "Ho sakta hai",
        dontKnow: "Pata nahi",

        // Guess feedback
        correct: "Bilkul sahi!",
        incorrect: "Ye kaun tha?",

        // Confidence
        confidence: "Confidence",
        confidenceVeryHigh: "Bilkul pakka - yahi player hain 100%",
        confidenceHigh: "Strong confidence - yahi hain likely",
        confidenceMedium: "Theek hai - ho sakta hai yahi",
        confidenceLow: "Weak confidence - ho sakta hai kuch aur bhi",

        // Reasoning
        topReasoningFactors: "Top Reasons",
        efficiency: "Efficiency",
        process: "Process",

        // Post Game
        postGameTitle: "Game Over!",
        questionsAsked: "Questions Puche",
        inferenceEfficiency: "Inference Efficiency",
        topRejected: "Top Rejected Players",

        // Voice
        listenMode: "Sun raha hoon...",
        speakAnswer: "Apna Answer Bolo",
        voiceNotSupported: "Ye browser voice support nahi karta",

        // Thinking
        analyzing: "Analyze kar raha hoon...",
        filtering: "Filter kar raha hoon...",
        reducing: "Reduce kar raha hoon...",
        evaluating: "Evaluate kar raha hoon...",
    },
};

/**
 * Get text in specified language
 */
export function getText(key, language = LANGUAGES.ENGLISH) {
    return STRINGS[language]?.[key] || STRINGS[LANGUAGES.ENGLISH][key] || key;
}

/**
 * Get all available languages
 */
export function getAvailableLanguages() {
    return [
        { code: LANGUAGES.ENGLISH, name: "English", flag: "🇬🇧" },
        { code: LANGUAGES.HINDI, name: "हिंदी", flag: "🇮🇳" },
        { code: LANGUAGES.HINGLISH, name: "Hinglish", flag: "🇮🇳" },
    ];
}

/**
 * Check if language is supported
 */
export function isLanguageSupported(language) {
    return Object.values(LANGUAGES).includes(language);
}
