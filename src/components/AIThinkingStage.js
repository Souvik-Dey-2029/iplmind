/**
 * AIThinkingStage Component
 * Shows animated thinking messages that simulate AI reasoning.
 * Creates cinematic feel during answer processing.
 */

/* eslint-disable react-hooks/set-state-in-effect */

"use client";

import { useState, useEffect, useRef } from "react";

const THINKING_STAGES = [
    { stage: "analyzing", delay: 0 },
    { stage: "filtering", delay: 400 },
    { stage: "reducing", delay: 800 },
    { stage: "evaluating", delay: 1200 },
];

export default function AIThinkingStage({
    isVisible = false,
    personalityMode = "analyst",
    onComplete = () => { },
    totalDuration = 2000,
}) {
    const [activeStage, setActiveStage] = useState(null);
    const [completedStages, setCompletedStages] = useState([]);
    const timerRefs = useRef([]);

    // Get thinking message based on personality mode
    function getThinkingMessage(stage) {
        const messages = {
            analyst: {
                analyzing: "🔬 Analyzing batting metrics...",
                filtering: "📊 Cross-referencing team history...",
                reducing: "🎯 Applying probabilistic constraints...",
                evaluating: "👑 Evaluating leadership patterns...",
            },
            commentator: {
                analyzing: "🎙️ Examining the player profile...",
                filtering: "🏟️ Looking at franchise history...",
                reducing: "⚡ Narrowing down the field...",
                evaluating: "👑 Checking captaincy credentials...",
            },
            meme: {
                analyzing: "📊 big brain time...",
                filtering: "🧠 scrolling through team records...",
                reducing: "🔪 cutting the list...",
                evaluating: "🎭 vibes check...",
            },
            "gen-z": {
                analyzing: "bestie let me analyze... ✨",
                filtering: "looking thru the archive slay 💁",
                reducing: "cutting the weak ones out 💅",
                evaluating: "checking their leader energy 👑",
            },
        };

        return messages[personalityMode]?.[stage] || messages.analyst[stage];
    }

    useEffect(() => {
        if (!isVisible) {
            return;
        }

        // Reset stages when visible
        setActiveStage(null);
        setCompletedStages([]);

        // Clean up previous timers
        timerRefs.current.forEach(clearTimeout);
        timerRefs.current = [];

        const timers = THINKING_STAGES.map((item) => {
            return setTimeout(() => {
                setActiveStage(item.stage);
                setCompletedStages((prev) => [...prev, item.stage]);
            }, item.delay);
        });
        timerRefs.current = timers;

        // Complete sequence after total duration
        const completeTimer = setTimeout(() => {
            setActiveStage(null);
            onComplete();
        }, totalDuration);
        timerRefs.current.push(completeTimer);

        return () => {
            timerRefs.current.forEach(clearTimeout);
            timerRefs.current = [];
        };
    }, [isVisible, totalDuration, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg p-8 border border-cyan-500/50 shadow-2xl shadow-cyan-500/20 max-w-md">
                {/* Thinking Animation */}
                <div className="flex items-center justify-center gap-2 mb-6">
                    <span className="text-3xl animate-pulse">🤖</span>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                        <div
                            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                        />
                        <div
                            className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                        />
                    </div>
                </div>

                {/* Current Stage Message */}
                {activeStage && (
                    <div className="text-center mb-6">
                        <p className="text-cyan-300 font-semibold text-lg transition-opacity duration-300">
                            {getThinkingMessage(activeStage)}
                        </p>
                    </div>
                )}

                {/* Progress Stages */}
                <div className="space-y-2">
                    {THINKING_STAGES.map((item) => {
                        const isActive = activeStage === item.stage;
                        const isCompleted = completedStages.includes(item.stage);

                        return (
                            <div
                                key={item.stage}
                                className={`h-1 rounded-full transition-all duration-300 ${isCompleted
                                    ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                                    : isActive
                                        ? "bg-cyan-400 shadow-lg shadow-cyan-400/50"
                                        : "bg-slate-700"
                                    }`}
                                style={{
                                    width: isActive ? "100%" : isCompleted ? "100%" : "0%",
                                }}
                            />
                        );
                    })}
                </div>

                {/* Loading Text */}
                <p className="text-center text-slate-400 text-xs mt-6 font-mono">
                    AI PROCESSING
                    <span className="inline-block ml-1">
                        <span className="animate-pulse">.</span>
                        <span className="animate-pulse" style={{ animationDelay: "0.2s" }}>
                            .
                        </span>
                        <span className="animate-pulse" style={{ animationDelay: "0.4s" }}>
                            .
                        </span>
                    </span>
                </p>
            </div>
        </div>
    );
}
