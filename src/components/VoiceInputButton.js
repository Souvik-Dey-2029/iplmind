/**
 * Voice Input Button Component
 * Handles speech-to-text for game answers
 */

/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useState, useEffect, useRef } from "react";
import { VoiceInput, isVoiceSupported, getWebSpeechLanguage } from "@/lib/voiceInteraction";

export default function VoiceInputButton({
    onAnswer = () => { },
    language = "english",
    disabled = false,
}) {
    const [isListening, setIsListening] = useState(false);
    const [supported, setSupported] = useState(true);
    const [transcript, setTranscript] = useState("");
    const voiceInputRef = useRef(null);
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (!isVoiceSupported()) {
            setSupported(false);
            return;
        }

        try {
            const webSpeechLang = getWebSpeechLanguage(language);
            const voice = new VoiceInput(webSpeechLang);
            voiceInputRef.current = voice;

            // Set up result handler
            voice.onResult((result) => {
                setTranscript(result.transcript);

                if (result.isFinal) {
                    const normalized = VoiceInput.normalizeAnswer(result.transcript);
                    if (normalized) {
                        setIsListening(false);
                        onAnswer(normalized, result.transcript);
                        setTranscript("");
                    }
                }
            });

            // Set up error handler
            voice.onError((error) => {
                console.warn("Voice error:", error);
                setIsListening(false);
            });
        } catch (error) {
            console.warn("Voice initialization failed:", error);
            setSupported(false);
        }
    }, [language, onAnswer]);

    const toggleListening = () => {
        if (!voiceInputRef.current || !supported) return;

        if (isListening) {
            voiceInputRef.current.stopListening();
            setIsListening(false);
        } else {
            setTranscript("");
            voiceInputRef.current.startListening();
            setIsListening(true);
        }
    };

    if (!supported) {
        return null;
    }

    return (
        <div className="relative">
            <button
                onClick={toggleListening}
                disabled={disabled || !supported}
                className={`px-4 py-2 rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 ${isListening
                    ? "bg-red-500/80 hover:bg-red-600 text-white shadow-lg shadow-red-500/50"
                    : "bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50"
                    } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
                <span
                    className={`text-lg ${isListening ? "animate-pulse" : ""}`}
                >
                    🎤
                </span>
                {isListening ? "Listening..." : "Speak"}
            </button>

            {/* Transcript display */}
            {transcript && (
                <div className="absolute top-full mt-2 bg-slate-900 border border-cyan-500/50 rounded-lg p-2 text-cyan-300 text-sm whitespace-nowrap">
                    {transcript}
                </div>
            )}
        </div>
    );
}
