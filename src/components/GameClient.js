"use client";

import { useMemo, useState } from "react";

const answerOptions = ["Yes", "No", "Maybe", "Don't Know"];

export default function GameClient() {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [candidatesRemaining, setCandidatesRemaining] = useState(0);
  const [guess, setGuess] = useState(null);
  const [topCandidates, setTopCandidates] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [adaptiveQuestionLimit, setAdaptiveQuestionLimit] = useState(12);
  const [debugReasoningPanel, setDebugReasoningPanel] = useState(null);
  const [phase, setPhase] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [correctPlayer, setCorrectPlayer] = useState("");
  const [finishedMessage, setFinishedMessage] = useState("");

  const progress = useMemo(() => Math.min(Math.max(confidence, questionNumber * 6), 100), [
    confidence,
    questionNumber,
  ]);

  async function startGame() {
    setLoading(true);
    setError("");
    setGuess(null);
    setFinishedMessage("");
    setCorrectPlayer("");

    try {
      const response = await fetch("/api/session/start", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start game");

      setSessionId(data.sessionId);
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || 12);
      setConfidence(0);
      setDebugReasoningPanel(null);
      setTopCandidates([]);
      setPhase("playing");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function answerQuestion(answer) {
    if (!sessionId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit answer");

      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setConfidence(data.confidence || data.guess?.confidence || 0);
      setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || adaptiveQuestionLimit);
      setDebugReasoningPanel(data.debugReasoningPanel || null);

      if (data.status === "guessing") {
        setGuess(data.guess);
        setPhase("guessing");
        return;
      }

      setQuestion(data.question);
      setTopCandidates(data.topCandidates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(wasCorrect) {
    if (!sessionId) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          wasCorrect,
          correctPlayerName: correctPlayer,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save feedback");

      setPhase("finished");
      setFinishedMessage(
        wasCorrect
          ? "Called it. The cricket brain is warm."
          : "Noted. I logged the correction for this round."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f8f6ef] text-[#15211f]">
      <section className="relative flex min-h-screen items-center px-5 py-8 sm:px-10 lg:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(235,99,52,0.2),transparent_28%),radial-gradient(circle_at_80%_15%,rgba(0,115,94,0.2),transparent_30%),linear-gradient(135deg,#f8f6ef_0%,#e8f0df_45%,#d9e8e1_100%)]" />
        <div className="absolute bottom-0 left-0 right-0 h-44 bg-[linear-gradient(180deg,transparent,#14624f_85%)] opacity-90" />
        <div className="absolute bottom-8 left-1/2 h-32 w-[120vw] -translate-x-1/2 rounded-[50%] border-[18px] border-white/50" />

        <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#15211f]/15 bg-white/60 px-4 py-2 text-sm font-semibold backdrop-blur">
              <span className="h-2.5 w-2.5 rounded-full bg-[#eb6334]" />
              IPLMind
            </div>
            <div>
              <h1 className="max-w-2xl text-5xl font-black leading-[0.95] tracking-normal text-[#101817] sm:text-7xl">
                Think of an IPL player.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-8 text-[#34433f]">
                I will keep asking high-signal yes/no questions until the read is
                strong enough.
              </p>
            </div>
            <button
              className="h-13 rounded-md bg-[#eb6334] px-7 text-base font-bold text-white shadow-lg shadow-[#eb6334]/25 transition hover:bg-[#d85429] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              onClick={startGame}
            >
              {phase === "idle" ? "Start game" : "Restart game"}
            </button>
          </div>

          <div className="rounded-lg border border-[#15211f]/12 bg-white/80 p-5 shadow-2xl shadow-[#15211f]/10 backdrop-blur md:p-7">
            {phase === "idle" && <IdlePanel />}
            {phase === "playing" && (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase text-[#eb6334]">
                      Question {questionNumber}
                    </p>
                    <p className="text-sm text-[#63706d]">
                      {candidatesRemaining} candidates still alive
                    </p>
                  </div>
                  <div className="h-2 w-44 overflow-hidden rounded-full bg-[#d8ddd4]">
                    <div
                      className="h-full rounded-full bg-[#00735e] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-md bg-[#15211f] p-6 text-white">
                  <p className="text-2xl font-black leading-tight sm:text-3xl">
                    {question}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {answerOptions.map((answer) => (
                    <button
                      key={answer}
                      className="h-14 rounded-md border border-[#15211f]/15 bg-white px-4 text-base font-bold transition hover:border-[#00735e] hover:bg-[#e8f0df] disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={loading}
                      onClick={() => answerQuestion(answer)}
                    >
                      {answer}
                    </button>
                  ))}
                </div>

                {topCandidates.length > 0 && (
                  <div className="rounded-md bg-[#f3f0e6] p-4">
                    <p className="text-sm font-bold text-[#34433f]">
                      Current read
                    </p>
                    <div className="mt-3 grid gap-2">
                      {topCandidates.map((candidate) => (
                        <div
                          key={candidate.id || candidate.name}
                          className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                        >
                          <span>{displayName(candidate)}</span>
                          <span className="font-bold text-[#00735e]">
                            {(candidate.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === "guessing" && guess && (
              <div className="space-y-6">
                <p className="text-sm font-bold uppercase text-[#eb6334]">
                  My guess
                </p>
                <div className="rounded-md bg-[#15211f] p-6 text-white">
                  <p className="text-4xl font-black">{guess.player.name}</p>
                  <p className="mt-2 text-white/75">
                    {guessFacts(guess).join(" | ")}
                  </p>
                  <p className="mt-5 text-lg leading-7">{cleanText(guess.explanation)}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    className="h-13 rounded-md bg-[#00735e] px-5 font-bold text-white transition hover:bg-[#095f50]"
                    disabled={loading}
                    onClick={() => sendFeedback(true)}
                  >
                    Correct
                  </button>
                  <div className="flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-md border border-[#15211f]/15 bg-white px-3 outline-none focus:border-[#eb6334]"
                      placeholder="Who was it?"
                      value={correctPlayer}
                      onChange={(event) => setCorrectPlayer(event.target.value)}
                    />
                    <button
                      className="h-13 rounded-md border border-[#15211f]/15 bg-white px-5 font-bold transition hover:bg-[#f3f0e6]"
                      disabled={loading}
                      onClick={() => sendFeedback(false)}
                    >
                      Missed
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === "finished" && (
              <div className="grid min-h-[390px] place-items-center rounded-md bg-[#15211f] p-8 text-center text-white">
                <div>
                  <CricketMark />
                  <h2 className="mt-6 text-3xl font-black">Round complete</h2>
                  <p className="mt-3 text-white/75">{finishedMessage}</p>
                  <button
                    className="mt-7 h-13 rounded-md bg-[#eb6334] px-7 font-bold text-white transition hover:bg-[#d85429]"
                    disabled={loading}
                    onClick={startGame}
                  >
                    Play again
                  </button>
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-md bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </p>
            )}

            {debugReasoningPanel && (
              <DebugReasoningPanel debugReasoningPanel={debugReasoningPanel} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function DebugReasoningPanel({ debugReasoningPanel }) {
  const topCandidate = debugReasoningPanel.canonicalCandidates?.[0];

  return (
    <details className="mt-4 rounded-md border border-[#15211f]/12 bg-white/75 p-4 text-sm">
      <summary className="cursor-pointer font-bold text-[#34433f]">
        Debug reasoning panel
      </summary>
      <div className="mt-3 grid gap-2 text-[#53615d]">
        <p>Canonical player id: {cleanText(topCandidate?.canonicalPlayerId) || "n/a"}</p>
        <p>Original raw source: {cleanText(topCandidate?.originalRawSource?.name) || "n/a"}</p>
        <p>Normalization result: {cleanText(topCandidate?.normalizationResult?.name) || "n/a"}</p>
        <p>Question category: {cleanText(debugReasoningPanel.questionCategory) || "n/a"}</p>
        <p>Entropy score: {Number(debugReasoningPanel.entropyScore || 0).toFixed(3)}</p>
        <p>Entropy delta: {Number(debugReasoningPanel.entropyDelta || 0).toFixed(3)}</p>
        <p>
          Confidence:{" "}
          {Number(debugReasoningPanel.eliminationReasoning?.confidence || 0).toFixed(1)}%
        </p>
        <p>
          Confidence evolution:{" "}
          {(debugReasoningPanel.confidenceEvolution || [])
            .map((value) => Number(value || 0).toFixed(1))
            .join(" -> ") || "n/a"}
        </p>
      </div>
    </details>
  );
}

function displayName(candidate) {
  return cleanText(candidate?.player?.name || candidate?.name);
}

function guessFacts(guess) {
  const player = guess.player || {};
  return [
    player.country,
    player.role,
    player.latestSeasonTeam || player.currentTeam || player.teams?.at?.(-1),
    `${Math.round(guess.confidence)}% confidence`,
  ]
    .map(cleanText)
    .filter(Boolean);
}

function cleanText(value) {
  const cleaned = String(value || "")
    .replace(/\bunknown\b/gi, "")
    .replace(/\s+\|\s+\|/g, " | ")
    .replace(/\s+/g, " ")
    .trim();
  return /^(unknown|null|undefined|n\/a|na|-|none)$/i.test(cleaned) ? "" : cleaned;
}

function IdlePanel() {
  return (
    <div className="grid min-h-[390px] place-items-center rounded-md border border-dashed border-[#15211f]/20 bg-[#fffaf0]/70 p-8 text-center">
      <div>
        <CricketMark />
        <h2 className="mt-6 text-2xl font-black">Ready when you are</h2>
        <p className="mt-2 text-[#53615d]">
          Pick someone in your head: legend, current star, opener, finisher,
          spinner, quick, anyone in the dataset.
        </p>
      </div>
    </div>
  );
}

function CricketMark() {
  return (
    <svg
      className="mx-auto h-20 w-20"
      viewBox="0 0 120 120"
      role="img"
      aria-label="Cricket bat and ball"
    >
      <circle cx="60" cy="60" r="56" fill="#f3f0e6" />
      <path
        d="M76 18c7 4 12 10 15 18L45 82c-5 5-13 5-18 0s-5-13 0-18L76 18Z"
        fill="#eb6334"
      />
      <path d="M72 22 91 41" stroke="#15211f" strokeWidth="5" />
      <rect
        x="24"
        y="73"
        width="21"
        height="33"
        rx="8"
        transform="rotate(45 24 73)"
        fill="#00735e"
      />
      <circle cx="85" cy="82" r="15" fill="#fff" stroke="#15211f" strokeWidth="5" />
      <path d="M74 76c7 3 13 8 17 15" stroke="#eb6334" strokeWidth="4" />
    </svg>
  );
}
