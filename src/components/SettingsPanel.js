/**
 * Settings & Mode Selector Component
 * Language and personality mode picker
 */

"use client";

import { useState } from "react";
import { getAvailableLanguages } from "@/lib/i18n";
import { getAvailablePersonalities } from "@/lib/personalityModes";

export default function SettingsPanel({
    currentLanguage = "english",
    currentPersonality = "analyst",
    onLanguageChange = () => { },
    onPersonalityChange = () => { },
    isOpen = false,
    onClose = () => { },
}) {
    const languages = getAvailableLanguages();
    const personalities = getAvailablePersonalities();

    return (
        <>
            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur"
                    onClick={onClose}
                />
            )}

            {/* Settings Panel */}
            <div
                className={`fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-slate-900 to-slate-950 border-l border-cyan-500/30 transform transition-transform duration-300 ${isOpen ? "translate-x-0" : "translate-x-full"
                    } shadow-2xl shadow-cyan-500/10 z-50`}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-cyan-300 hover:text-cyan-100 transition-colors"
                >
                    ✕
                </button>

                <div className="p-6 h-full overflow-y-auto">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mb-6">
                        Settings
                    </h2>

                    {/* Language Selector */}
                    <div className="mb-8">
                        <h3 className="text-cyan-300 font-semibold mb-3 flex items-center gap-2">
                            <span>🌐</span> Language
                        </h3>
                        <div className="space-y-2">
                            {languages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => {
                                        onLanguageChange(lang.code);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${currentLanguage === lang.code
                                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                                            : "bg-slate-800/30 border-slate-700/50 text-slate-300 hover:border-cyan-500/30"
                                        }`}
                                >
                                    <div className="font-semibold">
                                        {lang.flag} {lang.name}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Personality Selector */}
                    <div>
                        <h3 className="text-cyan-300 font-semibold mb-3 flex items-center gap-2">
                            <span>🎭</span> AI Personality
                        </h3>
                        <div className="space-y-2">
                            {personalities.map((pers) => (
                                <button
                                    key={pers.mode}
                                    onClick={() => {
                                        onPersonalityChange(pers.mode);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${currentPersonality === pers.mode
                                            ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-200"
                                            : "bg-slate-800/30 border-slate-700/50 text-slate-300 hover:border-cyan-500/30"
                                        }`}
                                >
                                    <div className="font-semibold">{pers.emoji} {pers.name}</div>
                                    <div className="text-xs text-slate-400">{pers.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Info Footer */}
                    <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-cyan-500/10">
                        <p className="text-xs text-slate-400">
                            💡 <strong>Tip:</strong> Change language and personality to customize your
                            IPLMind experience!
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
