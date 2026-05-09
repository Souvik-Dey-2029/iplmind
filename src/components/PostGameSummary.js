/**
 * Post-Game Summary Component
 * Displays game stats, efficiency metrics, and reasoning path
 */

"use client";

export default function PostGameSummary({
    guessedPlayer = {},
    correctPlayer = {},
    gameStats = {},
    summary = {},
    isVisible = false,
}) {
    if (!isVisible) return null;

    const {
        questionsAsked = 0,
        efficiency = "standard",
        reasoningPath = [],
        topRejected = [],
    } = summary;

    const efficiency_percent = Math.round((efficiency / 20) * 100);
    const isCorrect = guessedPlayer?.id === correctPlayer?.id;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl border border-cyan-500/30 shadow-2xl shadow-cyan-500/20 max-w-2xl w-full p-8 max-h-96 overflow-y-auto">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-blue-400 mb-2">
                        {isCorrect ? "🎉 Perfect Guess!" : "Game Over"}
                    </h2>
                    <p className="text-slate-300">
                        {isCorrect
                            ? `Nailed it! I guessed ${guessedPlayer?.name} correctly.`
                            : `I guessed ${guessedPlayer?.name}, but you were thinking of ${correctPlayer?.name}.`}
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Questions Asked */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                        <div className="text-cyan-300 text-sm font-semibold mb-1">
                            Questions Asked
                        </div>
                        <div className="text-3xl font-bold text-cyan-400">{questionsAsked}</div>
                        <div className="text-xs text-slate-400 mt-1">
                            {questionsAsked <= 10 ? "Lightning Fast ⚡" : "Standard Pace 🎯"}
                        </div>
                    </div>

                    {/* Efficiency */}
                    <div className="bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                        <div className="text-cyan-300 text-sm font-semibold mb-1">
                            Efficiency
                        </div>
                        <div className="text-3xl font-bold text-cyan-400">
                            {efficiency_percent}%
                        </div>
                        <div className="h-1.5 bg-slate-700 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
                                style={{ width: `${efficiency_percent}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Reasoning Path */}
                {reasoningPath.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-cyan-300 font-semibold mb-3 text-sm">
                            Reasoning Path
                        </h3>
                        <div className="space-y-2">
                            {reasoningPath.slice(0, 4).map((step, idx) => (
                                <div
                                    key={idx}
                                    className="flex gap-3 text-sm bg-slate-800/30 rounded p-2 border border-cyan-500/10"
                                >
                                    <span className="text-cyan-400 font-semibold">
                                        Q{idx + 1}
                                    </span>
                                    <p className="text-slate-300">{step}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Top Rejected */}
                {topRejected.length > 0 && (
                    <div className="mb-6">
                        <h3 className="text-cyan-300 font-semibold mb-2 text-sm">
                            Almost Had It
                        </h3>
                        <div className="flex gap-2 flex-wrap">
                            {topRejected.slice(0, 3).map((player) => (
                                <div
                                    key={player.id}
                                    className="bg-slate-800/50 border border-orange-500/30 rounded px-3 py-1 text-xs text-orange-300"
                                >
                                    {player.name} ({Math.round(player.probability * 100)}%)
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 pt-4 border-t border-slate-700/50">
                    {isCorrect
                        ? "Your mind is readable. Let's go again! 🧠"
                        : "Great round! Ready for another? 🎯"}
                </div>
            </div>
        </div>
    );
}
