/**
 * ConfidenceLeaderboard Component
 * Displays top 5 candidates with animated confidence bars.
 * Updates in real-time as probabilities change.
 */

"use client";

import { useMemo } from "react";

export default function ConfidenceLeaderboard({
    probabilities = {},
    candidates = [],
    topCandidate = null,
    animate = true,
}) {
    // Get top 5 candidates by probability
    const topCandidates = useMemo(() => {
        const ranked = candidates
            .map((c) => ({
                name: c.name,
                probability: probabilities[c.name] || 0,
                team: c.teams?.[c.teams.length - 1] || "Unknown",
            }))
            .sort((a, b) => b.probability - a.probability)
            .slice(0, 5);

        return ranked;
    }, [probabilities, candidates]);

    const maxProb = Math.max(...topCandidates.map((c) => c.probability), 0.01);

    return (
        <div className="w-full max-w-2xl mx-auto rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 p-6 border border-cyan-500/30 shadow-lg">
            {/* Header */}
            <div className="mb-6">
                <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center gap-2">
                    <span className="text-xl">📊</span> Top Candidates
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                    Real-time probability analysis
                </p>
            </div>

            {/* Leaderboard */}
            <div className="space-y-3">
                {topCandidates.map((candidate, idx) => {
                    const isTop = topCandidate && candidate.name === topCandidate.name;
                    const percentage = Math.round(candidate.probability * 100);
                    const barWidth = (candidate.probability / maxProb) * 100;

                    return (
                        <div
                            key={candidate.name}
                            className={`group transition-all duration-300 ${isTop ? "transform scale-105 origin-left" : ""
                                }`}
                        >
                            {/* Rank + Name + Percentage */}
                            <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                    <span className={`text-sm font-bold w-6 ${isTop
                                            ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
                                            : "text-slate-400"
                                        }`}>
                                        #{idx + 1}
                                    </span>
                                    <span className={`text-sm font-semibold ${isTop
                                            ? "text-cyan-300"
                                            : "text-slate-300"
                                        }`}>
                                        {candidate.name}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        {candidate.team}
                                    </span>
                                </div>
                                <span className={`text-sm font-bold ${isTop
                                        ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500"
                                        : "text-slate-400"
                                    }`}>
                                    {percentage}%
                                </span>
                            </div>

                            {/* Animated Bar */}
                            <div className="relative h-2 bg-slate-700 rounded-full overflow-hidden border border-slate-600">
                                <div
                                    className={`h-full rounded-full transition-all duration-500 ${isTop
                                            ? "bg-gradient-to-r from-cyan-500 to-blue-500 shadow-lg shadow-cyan-500/50"
                                            : "bg-gradient-to-r from-slate-600 to-slate-500"
                                        }`}
                                    style={{
                                        width: animate ? `${barWidth}%` : "0%",
                                    }}
                                />
                                {/* Shimmer effect on top */}
                                {isTop && (
                                    <div
                                        className="absolute top-0 left-0 h-full w-1 bg-white opacity-60 blur-sm animate-pulse"
                                        style={{
                                            animation: `shimmer 2s infinite`,
                                        }}
                                    />
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer Stats */}
            <div className="mt-6 pt-4 border-t border-slate-700 grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                    <div className="text-slate-400">Top Match</div>
                    <div className="text-cyan-400 font-bold">
                        {topCandidates[0]?.name || "Analyzing..."}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-slate-400">Confidence</div>
                    <div className="text-cyan-400 font-bold">
                        {topCandidates[0]
                            ? `${Math.round(topCandidates[0].probability * 100)}%`
                            : "0%"}
                    </div>
                </div>
                <div className="text-center">
                    <div className="text-slate-400">Pool</div>
                    <div className="text-cyan-400 font-bold">
                        {candidates.length} players
                    </div>
                </div>
            </div>

            <style jsx>{`
        @keyframes shimmer {
          0% {
            left: 0%;
          }
          50% {
            left: 100%;
          }
          100% {
            left: 100%;
          }
        }
      `}</style>
        </div>
    );
}
