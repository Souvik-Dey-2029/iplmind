"use client";
// Force recompile


import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const answerOptions = ["Yes", "No", "Maybe", "Don't Know"];
const answerEmojis = { Yes: "✅", No: "❌", Maybe: "🤔", "Don't Know": "🤷" };

// Mascot reactions based on game state
const MASCOT_STATES = {
  idle: { emoji: "🏏", text: "Think of any IPL player... I'll read your mind!" },
  thinking: { emoji: "🧠", text: "Hmm, let me think about this..." },
  confident: { emoji: "👀", text: "I think I'm getting close now..." },
  veryConfident: { emoji: "😏", text: "Oh, I definitely know who this is!" },
  shocked: { emoji: "😲", text: "Wait... that changes everything!" },
  wrong: { emoji: "😅", text: "Oops! Let me try again..." },
  victory: { emoji: "🎉", text: "I knew it! The cricket brain never fails!" },
  failed: { emoji: "🤯", text: "You've stumped me! Well played!" },
  earlyGame: { emoji: "🔍", text: "Just warming up... need more clues!" },
};

function getMascotState(phase, confidence, questionNumber, lastAnswer) {
  if (phase === "finished") return MASCOT_STATES.victory;
  if (phase === "failed") return MASCOT_STATES.failed;
  if (phase === "guessing") return MASCOT_STATES.veryConfident;
  if (phase === "idle") return MASCOT_STATES.idle;
  if (lastAnswer === "No") return MASCOT_STATES.shocked;
  if (questionNumber < 4) return MASCOT_STATES.earlyGame;
  if (confidence > 60) return MASCOT_STATES.veryConfident;
  if (confidence > 35) return MASCOT_STATES.confident;
  return MASCOT_STATES.thinking;
}

export default function GameClient({ onBackToHome }) {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [candidatesRemaining, setCandidatesRemaining] = useState(0);
  const [guess, setGuess] = useState(null);
  const [topCandidates, setTopCandidates] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [adaptiveQuestionLimit, setAdaptiveQuestionLimit] = useState(14);
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [phase, setPhase] = useState("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [correctPlayer, setCorrectPlayer] = useState("");
  const [finishedMessage, setFinishedMessage] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");

  const inFlightRef = useRef(false);
  const mascot = getMascotState(phase, confidence, questionNumber, lastAnswer);

  const progress = useMemo(
    () => Math.min(Math.max(confidence, questionNumber * 4), 100),
    [confidence, questionNumber]
  );

  async function startGame() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");
    setGuess(null);
    setFinishedMessage("");
    setCorrectPlayer("");
    setWrongGuessCount(0);

    try {
      const response = await fetch("/api/session/start", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not start game");

      setSessionId(data.sessionId);
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || 14);
      setConfidence(0);
      setTopCandidates([]);
      setPhase("playing");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function answerQuestion(answer) {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");
    setLastAnswer(answer);

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
      setConfidence(data.confidence ?? data.guess?.confidence ?? 0);
      setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || adaptiveQuestionLimit);
      setWrongGuessCount(data.wrongGuessCount || 0);

      if (data.status === "guessing") {
        setGuess(data.guess);
        setPhase("guessing");
        return;
      }

      if (data.status === "failed") {
        setPhase("failed");
        setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
        return;
      }

      setQuestion(data.question);
      setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function handleContinueGame() {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "continue" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not continue game");

      if (data.status === "failed") {
        setPhase("failed");
        setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
        return;
      }

      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setConfidence(data.confidence || 0);
      setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
      setWrongGuessCount(data.wrongGuessCount || 0);
      setGuess(null);
      setPhase("playing");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function sendFeedback(wasCorrect) {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/session/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, wasCorrect, correctPlayerName: correctPlayer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save feedback");

      setPhase("finished");
      setFinishedMessage(
        wasCorrect
          ? "🎯 Nailed it! The cricket brain stays undefeated."
          : `📝 Noted! I'll remember ${correctPlayer || "that player"} for next time.`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  async function revealPlayer() {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);

    try {
      await fetch("/api/session/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action: "reveal", correctPlayerName: correctPlayer }),
      });
      setPhase("finished");
      setFinishedMessage(`📝 ${correctPlayer || "Unknown player"} — I'll learn from this!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  return (
    <div style={{ background: 'radial-gradient(circle at top right, rgba(29, 80, 49, 0.15) 0%, transparent 70%), radial-gradient(circle at bottom left, rgba(253, 129, 0, 0.1) 0%, transparent 60%), #f8faf5', minHeight: '100vh' }}>
      {/* ── Shared Header (same as Home) ── */}
      <header style={{
        background: 'rgba(248, 250, 245, 0.6)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid rgba(255,255,255,0.2)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <nav style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          maxWidth: 1280,
          margin: '0 auto',
          padding: '16px 24px',
        }}>
          <div
            onClick={onBackToHome}
            style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: 40,
              fontWeight: 800,
              color: '#00361a',
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
              cursor: onBackToHome ? 'pointer' : 'default',
            }}
          >
            IPL Genius
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: 700,
              color: '#954a00',
              fontSize: 14,
            }}>
              🎮 In Game
            </span>
            {questionNumber > 0 && (
              <span style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 600,
                color: '#414942',
                fontSize: 13,
                background: '#e7e9e4',
                padding: '4px 12px',
                borderRadius: 9999,
              }}>
                Q{questionNumber}
              </span>
            )}
          </div>
        </nav>
      </header>

      {/* ── Game Content ── */}
      <main className="game-main" style={{ minHeight: 'calc(100vh - 80px)' }}>
        <div className="game-container">
          {/* Mascot */}
          <motion.div
            className="mascot-bar"
            key={mascot.text}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="mascot-emoji">{mascot.emoji}</span>
            <span className="mascot-text">{mascot.text}</span>
          </motion.div>

          {/* Game Card */}
          <div className="game-card">
            <AnimatePresence mode="wait">
              {phase === "idle" && (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="idle-panel">
                  <div className="idle-icon">🏏</div>
                  <h2 className="idle-title">Ready to Play?</h2>
                  <p className="idle-desc">Think of any IPL player — legend, star, opener, finisher, spinner, anyone in the dataset.</p>
                  <button className="btn-primary" disabled={loading} onClick={startGame}>
                    {loading ? "Starting..." : "Start Game"}
                  </button>
                </motion.div>
              )}

              {phase === "playing" && (
                <motion.div key="playing" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="playing-panel">
                  <div className="question-header">
                    <div>
                      <p className="question-number">Question {questionNumber}</p>
                      <p className="candidates-count">{candidatesRemaining} candidates remaining</p>
                    </div>
                    <div className="progress-container">
                      <div className="progress-bar">
                        <motion.div className="progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.6 }} />
                      </div>
                      <span className="progress-label">{Math.round(confidence)}%</span>
                    </div>
                  </div>

                  {question ? (
                    <motion.div className="question-box" key={question} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                      <p className="question-text">{question}</p>
                    </motion.div>
                  ) : (
                    <div className="question-box"><p className="loading-text">Loading next question...</p></div>
                  )}

                  <div className="answer-grid">
                    {answerOptions.map((a) => (
                      <motion.button
                        key={a}
                        className="btn-answer"
                        disabled={loading}
                        onClick={() => answerQuestion(a)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <span className="answer-emoji">{answerEmojis[a]}</span> {a}
                      </motion.button>
                    ))}
                  </div>

                  {wrongGuessCount > 0 && (
                    <p className="wrong-guess-badge">❌ {wrongGuessCount} wrong guess{wrongGuessCount > 1 ? "es" : ""} so far</p>
                  )}

                  {topCandidates.length > 0 && (
                    <div className="candidates-panel">
                      <p className="candidates-title">🎯 Current Read</p>
                      {topCandidates.slice(0, 4).map((c) => (
                        <div key={c.id || c.name} className="candidate-row">
                          <span>{cleanText(c?.player?.name || c?.name)}</span>
                          <span className="candidate-prob">{((c.probability ?? 0) * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {phase === "guessing" && guess && (
                <motion.div key="guessing" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="guess-panel">
                  <p className="guess-label">🎯 My Guess</p>
                  {guess.player?.name ? (
                    <>
                      <motion.div className="guess-reveal" initial={{ filter: "blur(12px)" }} animate={{ filter: "blur(0px)" }} transition={{ duration: 1.2 }}>
                        <h2 className="guess-name">{guess.player.name}</h2>
                        <p className="guess-facts">{(guessFacts(guess) || []).join(" • ")}</p>
                        <p className="guess-explanation">{cleanText(guess.explanation || "")}</p>
                        <div className="guess-confidence-bar">
                          <motion.div className="guess-confidence-fill" initial={{ width: 0 }} animate={{ width: `${Math.min(guess.confidence, 97)}%` }} transition={{ duration: 1, delay: 0.5 }} />
                          <span className="guess-confidence-label">{Math.round(guess.confidence)}% confidence</span>
                        </div>
                      </motion.div>
                      <div className="guess-actions">
                        <button className="btn-correct" disabled={loading} onClick={() => sendFeedback(true)}>
                          ✅ Correct!
                        </button>
                        <button className="btn-continue" disabled={loading} onClick={handleContinueGame}>
                          ❌ Wrong — Continue Game
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="question-box"><p className="loading-text">Player data unavailable</p></div>
                  )}
                </motion.div>
              )}

              {phase === "failed" && (
                <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="failed-panel">
                  <div className="failed-icon">🤯</div>
                  <h2 className="failed-title">You Stumped Me!</h2>
                  <p className="failed-desc">I couldn&apos;t figure out your player after {questionNumber} questions.</p>
                  <div className="reveal-form">
                    <p className="reveal-label">Who was it?</p>
                    <input
                      className="reveal-input"
                      placeholder="Enter player name..."
                      value={correctPlayer}
                      onChange={(e) => setCorrectPlayer(e.target.value)}
                    />
                    <button className="btn-primary" disabled={loading || !correctPlayer.trim()} onClick={revealPlayer}>
                      Reveal &amp; Teach Me
                    </button>
                  </div>
                  <button className="btn-secondary" disabled={loading} onClick={startGame}>Play Again</button>
                </motion.div>
              )}

              {phase === "finished" && (
                <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="finished-panel">
                  <div className="finished-icon">🏆</div>
                  <h2 className="finished-title">Round Complete</h2>
                  <p className="finished-message">{finishedMessage}</p>
                  <p className="finished-stats">Questions asked: {questionNumber} • Wrong guesses: {wrongGuessCount}</p>
                  <button className="btn-primary" disabled={loading} onClick={startGame}>Play Again</button>
                </motion.div>
              )}
            </AnimatePresence>

            {error && (
              <div className="error-box">
                <p className="error-text">⚠️ {error}</p>
                {phase !== "idle" && (
                  <button className="btn-error-restart" onClick={startGame}>Restart Game</button>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function guessFacts(g) {
  const player = g.player || {};
  return [player.country, player.role, player.latestSeasonTeam || player.currentTeam || player.teams?.at?.(-1)]
    .map(cleanText)
    .filter(Boolean);
}

function cleanText(value) {
  const cleaned = String(value || "").replace(/\bunknown\b/gi, "").replace(/\s+\|\s+\|/g, " | ").replace(/\s+/g, " ").trim();
  return /^(unknown|null|undefined|n\/a|na|-|none)$/i.test(cleaned) ? "" : cleaned;
}
