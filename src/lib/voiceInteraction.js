/**
 * Voice Interaction Layer
 * Speech-to-Text and Text-to-Speech for IPLMind
 * Browser-safe implementation with graceful fallback
 */

// Initialize Web Speech API
const SpeechRecognition =
    typeof window !== "undefined"
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

const SpeechSynthesis =
    typeof window !== "undefined" ? window.speechSynthesis : null;

/**
 * Check if browser supports voice interaction
 */
export function isVoiceSupported() {
    return SpeechRecognition !== null && SpeechSynthesis !== null;
}

/**
 * Speech-to-Text - Convert voice to answer
 */
export class VoiceInput {
    constructor(language = "en-IN") {
        if (!SpeechRecognition) {
            throw new Error("Speech Recognition not supported in this browser");
        }

        this.recognition = new SpeechRecognition();
        this.recognition.language = language;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;

        this.isListening = false;
        this.transcript = "";
        this.confidence = 0;
    }

    /**
     * Start listening for speech
     */
    startListening() {
        if (this.isListening) return;

        this.isListening = true;
        this.transcript = "";
        this.recognition.start();
    }

    /**
     * Stop listening
     */
    stopListening() {
        if (!this.isListening) return;

        this.isListening = false;
        this.recognition.stop();
    }

    /**
     * Set up event handlers
     */
    onResult(callback) {
        this.recognition.onresult = (event) => {
            this.transcript = "";
            this.confidence = 0;

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                const conf = event.results[i][0].confidence;

                this.transcript += transcript;
                this.confidence = Math.max(this.confidence, conf);
            }

            if (event.results[event.results.length - 1].isFinal) {
                callback({
                    transcript: this.transcript,
                    confidence: this.confidence,
                    isFinal: true,
                });
            }
        };
    }

    onError(callback) {
        this.recognition.onerror = (event) => {
            callback({
                error: event.error,
                message: `Speech error: ${event.error}`,
            });
        };
    }

    /**
     * Convert speech to Yes/No/Maybe/Don't Know
     */
    static normalizeAnswer(transcript) {
        if (!transcript) return null;

        const normalized = transcript.toLowerCase().trim();

        // Yes variations
        if (
            normalized.includes("yes") ||
            normalized.includes("haan") ||
            normalized.includes("ha") ||
            normalized.includes("yep") ||
            normalized.includes("yeah")
        ) {
            return "Yes";
        }

        // No variations
        if (
            normalized.includes("no") ||
            normalized.includes("nahi") ||
            normalized.includes("nope") ||
            normalized.includes("nah")
        ) {
            return "No";
        }

        // Maybe variations
        if (
            normalized.includes("maybe") ||
            normalized.includes("perhaps") ||
            normalized.includes("ho sakta") ||
            normalized.includes("ho sakte") ||
            normalized.includes("might")
        ) {
            return "Maybe";
        }

        // Don't know variations
        if (
            normalized.includes("don't know") ||
            normalized.includes("dont know") ||
            normalized.includes("no idea") ||
            normalized.includes("pata nahi") ||
            normalized.includes("nahi pata") ||
            normalized.includes("unsure")
        ) {
            return "Don't Know";
        }

        return null;
    }
}

/**
 * Text-to-Speech - Convert AI response to voice
 */
export class VoiceOutput {
    constructor(language = "en-IN") {
        if (!SpeechSynthesis) {
            throw new Error("Speech Synthesis not supported in this browser");
        }

        this.synth = SpeechSynthesis;
        this.language = language;
        this.isSpeaking = false;
    }

    /**
     * Speak text
     */
    speak(text, options = {}) {
        if (!text) return;

        const {
            rate = 1,
            pitch = 1,
            volume = 0.8,
            onEnd = () => { },
        } = options;

        // Cancel previous speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.language = this.language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
            onEnd();
        };

        utterance.onerror = (event) => {
            console.warn("Speech synthesis error:", event.error);
            this.isSpeaking = false;
            onEnd();
        };

        this.synth.speak(utterance);
    }

    /**
     * Stop speaking
     */
    stop() {
        this.synth.cancel();
        this.isSpeaking = false;
    }

    /**
     * Check if currently speaking
     */
    getSpeaking() {
        return this.isSpeaking;
    }
}

/**
 * Get appropriate language code for Web Speech API
 */
export function getWebSpeechLanguage(appLanguage) {
    const languageMap = {
        english: "en-IN",
        hindi: "hi-IN",
        hinglish: "en-IN", // Hinglish uses English recognition with Hindi/English mixing
    };

    return languageMap[appLanguage] || "en-IN";
}

/**
 * Initialize voice interaction
 */
export function initializeVoice(language = "english") {
    if (!isVoiceSupported()) {
        return { supported: false, error: "Voice not supported" };
    }

    const webSpeechLang = getWebSpeechLanguage(language);

    try {
        const input = new VoiceInput(webSpeechLang);
        const output = new VoiceOutput(webSpeechLang);

        return {
            supported: true,
            input,
            output,
        };
    } catch (error) {
        return {
            supported: false,
            error: error.message,
        };
    }
}
