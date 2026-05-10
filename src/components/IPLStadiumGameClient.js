"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import ThemeSwitcher from "./ThemeSwitcher";

const answerOptions = ["Yes", "No", "Maybe", "Don't Know"];
const answerIcons = { Yes: "🏏", No: "🚫", Maybe: "🤔", "Don't Know": "🤷‍♂️" };

// Team atmosphere colors for dynamic stadium adaptation
const TEAM_COLORS = {
  "Chennai Super Kings": { glow: "rgba(255,210,0,0.12)", accent: "#ffd700", label: "CSK" },
  "Mumbai Indians": { glow: "rgba(0,100,255,0.12)", accent: "#004ba0", label: "MI" },
  "Royal Challengers Bengaluru": { glow: "rgba(255,30,30,0.12)", accent: "#d4111e", label: "RCB" },
  "Kolkata Knight Riders": { glow: "rgba(100,50,200,0.12)", accent: "#3a225d", label: "KKR" },
  "Rajasthan Royals": { glow: "rgba(255,80,150,0.12)", accent: "#ea1a85", label: "RR" },
  "Delhi Capitals": { glow: "rgba(0,80,200,0.12)", accent: "#004c93", label: "DC" },
  "Sunrisers Hyderabad": { glow: "rgba(255,100,0,0.12)", accent: "#ff6600", label: "SRH" },
  "Punjab Kings": { glow: "rgba(220,0,0,0.12)", accent: "#dc0032", label: "PBKS" },
  "Gujarat Titans": { glow: "rgba(30,60,120,0.12)", accent: "#1c1c5e", label: "GT" },
  "Lucknow Super Giants": { glow: "rgba(0,160,200,0.12)", accent: "#00a3d9", label: "LSG" },
};

// Animated number counter for candidate shrinking
function AnimatedCounter({ value }) {
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (display === value) return;
    const step = display > value ? -1 : 1;
    const diff = Math.abs(display - value);
    const speed = Math.max(8, Math.min(60, 600 / diff));
    const timer = setTimeout(() => setDisplay(prev => {
      const next = prev + step * Math.max(1, Math.floor(diff / 15));
      return step > 0 ? Math.min(next, value) : Math.max(next, value);
    }), speed);
    return () => clearTimeout(timer);
  }, [display, value]);
  return <span>{display}</span>;
}

// AI Mind Scan Panel — rotating contextual analysis messages
function MindScanPanel({ hints, candidatesRemaining }) {
  const [activeHint, setActiveHint] = useState(0);
  useEffect(() => {
    if (!hints || hints.length === 0) return;
    const timer = setInterval(() => setActiveHint(p => (p + 1) % hints.length), 2200);
    return () => clearInterval(timer);
  }, [hints]);
  const currentHint = hints?.[activeHint] || "Scanning database...";
  return (
    <div className="ipl-ai-analysis">
      <div className="ipl-ai-analysis-title"><span>🧠</span> AI MIND SCAN</div>
      <AnimatePresence mode="wait">
        <motion.div key={currentHint} className="ipl-ai-analysis-text"
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}>
          {currentHint}
        </motion.div>
      </AnimatePresence>
      <div className="ipl-ai-analysis-bar"><div className="ipl-ai-analysis-fill" /></div>
      <div className="ipl-players-count"><AnimatedCounter value={candidatesRemaining || 842} /> Players remaining</div>
    </div>
  );
}

const MASCOT_STATES = {
  idle: { id: "idle", image: "/Assets/idle.png", text: "Think of any IPL player... I'll read your mind!" },
  thinking: { id: "thinking", image: "/Assets/thinking.png", text: "Hmm, let me think about this..." },
  confident: { id: "confident", image: "/Assets/confident.png", text: "I think I'm getting close now..." },
  sad: { id: "sad", image: "/Assets/sad.png", text: "Wait... that changes everything!" },
  victory: { id: "confident", image: "/Assets/confident.png", text: "I knew it! The cricket brain never fails!" },
  failed: { id: "sad", image: "/Assets/sad.png", text: "You've stumped me! Well played!" },
  wrong: { id: "sad", image: "/Assets/sad.png", text: "Oops! Let me try again..." },
};

function getMascotState(phase, confidence, questionNumber, lastAnswer, loading, finishedMessage) {
  if (phase === "finished") {
    if (finishedMessage && finishedMessage.includes("Noted")) return MASCOT_STATES.failed;
    return MASCOT_STATES.victory;
  }
  if (phase === "failed") return MASCOT_STATES.failed;
  if (phase === "guessing") return MASCOT_STATES.confident;
  if (phase === "idle" || questionNumber === 0) return MASCOT_STATES.idle;
  
  if (loading) return MASCOT_STATES.thinking;
  
  if (confidence > 55) return MASCOT_STATES.confident;
  
  // Natural rotation system: expression changes every 2 questions to feel alive
  const rotationIndex = Math.floor(questionNumber / 2) % 3;
  if (rotationIndex === 0) return MASCOT_STATES.idle;
  if (rotationIndex === 1) return MASCOT_STATES.thinking;
  return MASCOT_STATES.confident;
}

export default function IPLStadiumGameClient({ onBackToHome }) {
  const [sessionId, setSessionId] = useState(null);
  const [question, setQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [candidatesRemaining, setCandidatesRemaining] = useState(0);
  const [guess, setGuess] = useState(null);
  const [topCandidates, setTopCandidates] = useState([]);
  const [confidence, setConfidence] = useState(0);
  const [adaptiveQuestionLimit, setAdaptiveQuestionLimit] = useState(14);
  const [wrongGuessCount, setWrongGuessCount] = useState(0);
  const [phase, setPhase] = useState("playing");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [correctPlayer, setCorrectPlayer] = useState("");
  const [finishedMessage, setFinishedMessage] = useState("");
  const [lastAnswer, setLastAnswer] = useState("");
  const [commentary, setCommentary] = useState("");
  const [analysisHints, setAnalysisHints] = useState(["Initializing neural engine...", "Loading IPL archives...", "Calibrating inference model..."]);
  const [suspectedTeam, setSuspectedTeam] = useState(null);
  const [prevCandidates, setPrevCandidates] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(window.innerWidth <= 768);
  }, []);
  const [canUndo, setCanUndo] = useState(false);

  const inFlightRef = useRef(false);
  const mascot = getMascotState(phase, confidence, questionNumber, lastAnswer, loading, finishedMessage);

  const getApiUrl = (endpoint) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "";
    return `${baseUrl}${endpoint}`;
  };

  // Auto-start game on mount
  useEffect(() => {
    startGame();
  }, []);

  async function startGame() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");
    setGuess(null);
    setFinishedMessage("");
    setCorrectPlayer("");
    setWrongGuessCount(0);
    setCanUndo(false);

    try {
      const response = await fetch(getApiUrl("/api/session/start"), { method: "POST" });
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
      setCommentary("Let's see if I can read your mind... 🏏");
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
      const response = await fetch(getApiUrl("/api/session/answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, answer }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit answer");

      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setWrongGuessCount(data.wrongGuessCount || 0);

      if (data.status === "guessing") {
        // ATOMIC SNAPSHOT CONSUMPTION:
        // All state is set from the SAME frozen server response.
        // guess.confidence is the ONLY source of truth for confidence.
        const frozenGuess = data.guess;
        setGuess(frozenGuess);
        setConfidence(frozenGuess?.confidence ?? data.confidence ?? 0);
        if (Array.isArray(data.topCandidates)) setTopCandidates(data.topCandidates);
        setPhase("guessing");
        return;
      }

      if (data.status === "failed") {
        setPhase("failed");
        setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
        return;
      }

      // Playing phase
      setConfidence(data.confidence ?? 0);
      setAdaptiveQuestionLimit(data.adaptiveQuestionLimit || adaptiveQuestionLimit);
      setQuestion(data.question);
      setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
      if (data.commentary) setCommentary(data.commentary);
      if (data.analysisHints) setAnalysisHints(data.analysisHints);
      if (data.suspectedTeam !== undefined) setSuspectedTeam(data.suspectedTeam);
      setPrevCandidates(candidatesRemaining);
      setCanUndo(data.canUndo || false);
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
      const response = await fetch(getApiUrl("/api/session/feedback"), {
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
      const response = await fetch(getApiUrl("/api/session/feedback"), {
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
      await fetch(getApiUrl("/api/session/feedback"), {
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

  async function handleUndo() {
    if (!sessionId || inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError("");

    try {
      const response = await fetch(getApiUrl("/api/session/undo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not undo");

      // Restore exact previous state from snapshot
      setQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setCandidatesRemaining(data.candidatesRemaining);
      setConfidence(data.confidence ?? 0);
      setTopCandidates(Array.isArray(data.topCandidates) ? data.topCandidates : []);
      setWrongGuessCount(data.wrongGuessCount || 0);
      setCanUndo(data.canUndoMore || false);
      setGuess(null);
      setPhase("playing");
      setLastAnswer("");
      if (data.commentary) setCommentary(data.commentary);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }

  return (
    <div className="ipl-stadium-bg">
      {/* Header */}
      <header className="ipl-header" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24 }}>🏏</span>
            <span className="ipl-logo">IPL Genius</span>
          </div>
          <div style={{ display: isMobile ? "none" : "flex", gap: 24, alignItems: "center" }}>
            <span className="ipl-nav-link active">Predict</span>
            <Link href="/leaderboard" className="ipl-nav-link">Leaderboard</Link>
            <span className="ipl-nav-link">History</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ThemeSwitcher />
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #c084fc, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
          </div>
        </nav>
      </header>

      <main>
        {/* Team Atmosphere Overlay */}
        {suspectedTeam && TEAM_COLORS[suspectedTeam] && (
          <motion.div key={suspectedTeam} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.5 }}
            style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse at center, ${TEAM_COLORS[suspectedTeam].glow}, transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
        )}

        <div className="ipl-game-layout">
          {/* Left Column: AI Assistant */}
          <div className="ipl-ai-section">
              <motion.div className="ipl-ai-bubble" key={commentary || mascot.text}
                initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                style={{ marginBottom: 8, zIndex: 11, position: 'relative' }}>
                {commentary || mascot.text}
              </motion.div>
              
              <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: mascot.id === 'thinking' ? -28 : -64, 
                position: 'relative', 
                zIndex: 10,
                transition: 'margin-bottom 0.3s ease'
              }}>
                {/* Subtle glow connecting mascot and Mind Scan card */}
                <div style={{
                  position: 'absolute',
                  bottom: mascot.id === 'thinking' ? 20 : 50,
                  width: 120,
                  height: 40,
                  background: 'rgba(129, 140, 248, 0.4)',
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  zIndex: -1,
                  transition: 'bottom 0.3s ease'
                }} />
                
                <AnimatePresence mode="wait">
                  <motion.img 
                    key={mascot.id}
                    src={mascot.image}
                    alt="IPLMind Mascot"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ 
                      opacity: mascot.id === "sad" ? 0.7 : 1, 
                      scale: mascot.id === "confident" ? 1.05 : 1
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25 }}
                    style={{ width: 180, height: "auto", objectFit: 'contain' }}
                  />
                </AnimatePresence>
              </div>

              <MindScanPanel hints={analysisHints} candidatesRemaining={candidatesRemaining} />

              {suspectedTeam && TEAM_COLORS[suspectedTeam] && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ padding: "8px 12px", borderRadius: 8, background: TEAM_COLORS[suspectedTeam].glow, border: `1px solid ${TEAM_COLORS[suspectedTeam].accent}33`, textAlign: "center", fontSize: 11, color: TEAM_COLORS[suspectedTeam].accent, fontWeight: 700, letterSpacing: "0.06em" }}>
                  🏟️ {TEAM_COLORS[suspectedTeam].label} ATMOSPHERE
                </motion.div>
              )}
            </div>

            {/* Middle Column: Main Question/Action Area */}
            <div className="ipl-question-card ipl-glow">
              
              {/* Mobile & Desktop Back Button */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8 }}>
                <button className="ipl-back-btn" style={{ margin: 0, padding: "6px 12px", fontSize: "12px" }} onClick={onBackToHome}>
                  <span>←</span> Home
                </button>
                {canUndo && phase === "playing" && (
                  <button
                    className="ipl-undo-btn"
                    disabled={loading}
                    onClick={handleUndo}
                    title="Undo last answer"
                  >
                    <span>↩</span> Undo
                  </button>
                )}
                <div style={{ flex: 1, textAlign: "right" }}>
                  <span className="ipl-question-badge">
                    Q {questionNumber} / {adaptiveQuestionLimit}
                  </span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {phase === "playing" && (
                  <motion.div key="playing" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                    
                    {question ? (
                      <h2 className="ipl-question-text">{question}</h2>
                    ) : (
                      <h2 className="ipl-question-text">Loading next question...</h2>
                    )}
                    
                    <p className="ipl-question-hint">
                      This helps me understand the player type better.
                    </p>

                    <div className="ipl-answer-grid">
                      {answerOptions.map((a) => (
                        <button
                          key={a}
                          className="ipl-answer-btn"
                          disabled={loading}
                          onClick={() => answerQuestion(a)}
                        >
                          <span className="ipl-answer-icon">{answerIcons[a]}</span>
                          {a}
                        </button>
                      ))}
                    </div>
                    {wrongGuessCount > 0 && (
                      <p style={{ textAlign: "center", color: "rgba(255,100,20,0.8)", fontSize: 13, marginTop: 16 }}>
                        ❌ {wrongGuessCount} wrong guess{wrongGuessCount > 1 ? "es" : ""} so far
                      </p>
                    )}
                  </motion.div>
                )}

                {phase === "guessing" && guess && (
                  <motion.div key="guessing" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 20 }}>
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        style={{ display: "inline-block", padding: "4px 16px", borderRadius: 20, background: "rgba(255,140,0,0.15)", border: "1px solid rgba(255,140,0,0.3)", color: "#ff8c00", fontSize: 11, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 12 }}>
                        🎯 GUESS #{guess.guessNumber || 1}
                      </motion.div>
                    </div>
                    {guess.player?.name ? (
                      <div className="ipl-guess-reveal">
                        <motion.div initial={{ filter: "blur(16px)", opacity: 0 }} animate={{ filter: "blur(0px)", opacity: 1 }} transition={{ duration: 1.2, delay: 0.2 }}>
                          <div style={{ fontSize: 48, marginBottom: 8 }}>👀</div>
                          <h2 className="ipl-guess-name" style={{ fontSize: "clamp(24px,5vw,36px)" }}>{guess.player.name}</h2>
                          <p style={{ color: "rgba(200,200,255,0.5)", fontSize: 13, marginBottom: 6 }}>
                            {(guessFacts(guess) || []).join(" • ")}
                          </p>
                          {guess.player.currentTeam && TEAM_COLORS[guess.player.currentTeam] && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
                              style={{ display: "inline-block", padding: "4px 14px", borderRadius: 20, background: TEAM_COLORS[guess.player.currentTeam].glow, border: `1px solid ${TEAM_COLORS[guess.player.currentTeam].accent}44`, color: TEAM_COLORS[guess.player.currentTeam].accent, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                              {TEAM_COLORS[guess.player.currentTeam].label}
                            </motion.div>
                          )}
                        </motion.div>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(guess.confidence, 97)}%` }} transition={{ duration: 1.2, delay: 0.6 }}
                          style={{ height: 4, borderRadius: 99, background: "linear-gradient(90deg, #818cf8, #c084fc, #ff8c00)", margin: "12px auto", maxWidth: 250 }} />
                        <p style={{ color: "rgba(200,200,255,0.45)", fontSize: 12, marginBottom: 16 }}>{Math.round(guess.confidence)}% confidence</p>
                        <p style={{ color: "rgba(200,200,255,0.6)", fontSize: 13, lineHeight: 1.5, marginBottom: 24, maxWidth: 400, margin: "0 auto 24px" }}>
                          {cleanText(guess.explanation || "")}
                        </p>
                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                          <motion.button className="ipl-btn-primary" style={{ padding: "12px 28px", fontSize: 14 }} disabled={loading} onClick={() => sendFeedback(true)}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                            ✅ CORRECT
                          </motion.button>
                          <motion.button className="ipl-btn-primary" style={{ background: "rgba(255,255,255,0.06)", color: "#fff", boxShadow: "none", border: "1px solid rgba(255,255,255,0.15)", padding: "12px 28px", fontSize: 14 }} disabled={loading} onClick={handleContinueGame}
                            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                            ❌ WRONG
                          </motion.button>
                        </div>
                      </div>
                    ) : (
                      <p>Player data unavailable</p>
                    )}
                  </motion.div>
                )}

                {phase === "failed" && (
                  <motion.div key="failed" style={{ textAlign: "center", padding: "40px 0" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
                      style={{ width: 80, height: 80, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,140,0,0.2), transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 48 }}>
                      💥
                    </motion.div>
                    <h2 className="ipl-question-text">You Fooled IPLMind!</h2>
                    <p style={{ color: "rgba(200,200,255,0.6)", marginBottom: 8, fontSize: 14 }}>
                      I couldn&apos;t guess your player after {questionNumber} questions.
                    </p>
                    <p style={{ color: "#ff8c00", fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
                      🏆 +{Math.min(questionNumber * 10, 200)} Difficulty Points
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 300, margin: "0 auto" }}>
                      <p style={{ color: "rgba(200,200,255,0.5)", fontSize: 13 }}>Who was the player?</p>
                      <input
                        style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(0,0,0,0.3)", border: "1px solid rgba(100,80,255,0.3)", color: "#fff", fontSize: 14 }}
                        placeholder="Enter player name..."
                        value={correctPlayer}
                        onChange={(e) => setCorrectPlayer(e.target.value)}
                      />
                      <motion.button className="ipl-btn-primary" style={{ padding: "12px 24px", fontSize: 14 }} disabled={loading || !correctPlayer.trim()} onClick={revealPlayer}
                        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                        TEACH ME
                      </motion.button>
                      <button className="ipl-back-btn" style={{ justifyContent: "center", margin: "10px 0 0" }} disabled={loading} onClick={startGame}>
                        Play Again
                      </button>
                    </div>
                  </motion.div>
                )}

                {phase === "finished" && (
                  <motion.div key="finished" style={{ textAlign: "center", padding: "40px 0" }} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 200 }}>
                    <motion.div initial={{ rotate: -20, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, delay: 0.3 }}
                      style={{ fontSize: 64, marginBottom: 16 }}>🏆</motion.div>
                    <h2 className="ipl-question-text">Round Complete</h2>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                      style={{ color: "#fff", fontSize: 16, marginBottom: 8 }}>{finishedMessage}</motion.p>
                    <p style={{ color: "rgba(200,200,255,0.4)", fontSize: 12, marginBottom: 8 }}>
                      Questions: {questionNumber} • Wrong guesses: {wrongGuessCount}
                    </p>
                    <p style={{ color: "#ff8c00", fontSize: 13, fontWeight: 700, marginBottom: 24 }}>
                      ⚡ Score: +{Math.max(10, 100 - questionNumber * 5)} points
                    </p>
                    <motion.button className="ipl-btn-primary" disabled={loading} onClick={startGame}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                      PLAY AGAIN
                    </motion.button>
                  </motion.div>
                )}
                
                {error && (
                  <div style={{ marginTop: 20, padding: 12, background: "rgba(255,50,50,0.1)", border: "1px solid rgba(255,50,50,0.3)", borderRadius: 8, color: "#ff8c8c", fontSize: 13, textAlign: "center" }}>
                    ⚠️ {error}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Progress & Leaderboard */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div className="ipl-side-panel">
                <h3 className="ipl-panel-title">
                  <span>LIVE PROGRESS</span>
                  <span>📊</span>
                </h3>
                <div style={{ color: "rgba(200,200,255,0.5)", fontSize: 12, marginBottom: 8 }}>Confidence</div>
                <div className="ipl-confidence-value">{Math.round(confidence)}%</div>
                <div className="ipl-confidence-bar">
                  <div className="ipl-confidence-fill" style={{ width: `${Math.min(Math.max(confidence, questionNumber * 4), 100)}%` }} />
                </div>
                <div className="ipl-confidence-hint">Keep answering to increase confidence!</div>
              </div>

              <div className="ipl-side-panel">
                <h3 className="ipl-panel-title">
                  <span>TOP CANDIDATES</span>
                  <span>🏆</span>
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {topCandidates.length > 0 ? topCandidates.slice(0, 5).map((c, i) => (
                    <div key={c.id || c.name || i} className="ipl-candidate-row">
                      <div className={`ipl-candidate-rank ipl-rank-${i + 1 > 3 ? "default" : i + 1}`}>{i + 1}</div>
                      <span>{cleanText(c?.player?.name || c?.name)}</span>
                      <span className="ipl-candidate-prob">{((c.probability ?? 0) * 100).toFixed(0)}%</span>
                    </div>
                  )) : (
                    Array(5).fill(0).map((_, i) => (
                      <div key={i} className="ipl-candidate-row" style={{ opacity: 0.5 }}>
                        <div className={`ipl-candidate-rank ipl-rank-${i + 1 > 3 ? "default" : i + 1}`}>{i + 1}</div>
                        <span>Player Name</span>
                        <span className="ipl-candidate-prob">--%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        {/* Bottom Bar (Desktop only) */}
        {phase !== "idle" && (
          <div className="ipl-bottom-bar">
            <div className="ipl-bottom-item">
              <div className="ipl-bottom-icon" style={{ background: "rgba(100,80,255,0.15)", color: "#c084fc" }}>🎫</div>
              <div><strong>Play & Win Tickets</strong><br />Answer daily & earn</div>
            </div>
            <Link href="/leaderboard" className="ipl-bottom-item" style={{ borderLeft: "1px solid rgba(100,80,255,0.15)", paddingLeft: 32, textDecoration: 'none', color: 'inherit' }}>
              <div className="ipl-bottom-icon" style={{ background: "rgba(0,180,255,0.15)", color: "#00d4ff" }}>📊</div>
              <div><strong>Climb Leaderboard</strong><br />Beat other cricket fans</div>
            </Link>
            <div className="ipl-bottom-item" style={{ borderLeft: "1px solid rgba(100,80,255,0.15)", paddingLeft: 32 }}>
              <div className="ipl-bottom-icon" style={{ background: "rgba(255,140,0,0.15)", color: "#ff8c00" }}>🛡️</div>
              <div><strong>Unlock Achievements</strong><br />Show off your skills</div>
            </div>
          </div>
        )}
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
