/**
 * GuessExplanationCard Component
 * Displays AI reasoning factors and confidence explanations.
 * Shows why the AI made a specific guess.
 */

"use client";

export default function GuessExplanationCard({
    playerName,
    topFactors = [],
    confidence,
    explanations = {},
    personalityGuessPhrase,
    isVisible = false,
}) {
    if (!isVisible) return null;

    const confidenceClass =
        confidence >= 80
            ? "from-green-500 to-emerald-500"
            : confidence >= 65
                ? "from-cyan-500 to-blue-500"
                : confidence >= 50
                    ? "from-yellow-500 to-orange-500"
                    : "from-red-500 to-orange-500";

    return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in duration-500">
            <div className="rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-cyan-500/30 p-6 shadow-lg overflow-hidden relative">
                {/* Background accent */}
                <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${confidenceClass} opacity-70`} />

                {/* Header: Guess Phrase */}
                <div className="mb-6 pl-2">
                    <p className="text-slate-200 font-semibold leading-relaxed text-base">
                        {personalityGuessPhrase}
                    </p>
                </div>

                {/* Confidence Bar + Percentage */}
                <div className="mb-6 pl-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Confidence Level
                        </span>
                        <span className={`text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r ${confidenceClass}`}>
                            {confidence}%
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${confidenceClass} transition-all duration-500 shadow-lg`}
                            style={{ width: `${confidence}%` }}
                        />
                    </div>
                </div>

                {/* Top Factors */}
                {topFactors.length > 0 && (
                    <div className="mb-6 pl-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Top Reasoning Factors
                        </h4>
                        <div className="space-y-2">
                            {topFactors.map((factor, idx) => (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                    <span className="text-cyan-400 font-bold mt-0.5">
                                        {idx + 1}.
                                    </span>
                                    <span className="text-slate-300">{factor}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Explanations */}
                {explanations && (
                    <div className="pl-2 space-y-3 pt-4 border-t border-slate-700">
                        {explanations.confidence && (
                            <div className="text-xs">
                                <span className="text-slate-400 font-semibold">Confidence:</span>
                                <p className="text-slate-300 mt-1">{explanations.confidence}</p>
                            </div>
                        )}
                        {explanations.efficiency && (
                            <div className="text-xs">
                                <span className="text-slate-400 font-semibold">Efficiency:</span>
                                <p className="text-slate-300 mt-1">{explanations.efficiency}</p>
                            </div>
                        )}
                        {explanations.process && (
                            <div className="text-xs">
                                <span className="text-slate-400 font-semibold">Process:</span>
                                <p className="text-slate-300 mt-1">{explanations.process}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-bl-full" />
            </div>
        </div>
    );
}
