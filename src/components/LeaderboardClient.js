"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import "../app/ipl-stadium.css"; 

export default function LeaderboardClient() {
  const [data, setData] = useState({ fastestGuesses: [], aiDefeats: [], globalStats: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const loadLeaderboard = () => fetch("/api/leaderboard", { cache: "no-store" })
      .then(res => res.json())
      .then(d => {
        if (cancelled) return;
        if (d.error) {
          console.error("Leaderboard API returned error:", d.error);
          setData({ fastestGuesses: [], aiDefeats: [], globalStats: null });
        } else {
          setData({
            fastestGuesses: d.fastestGuesses || [],
            aiDefeats: d.aiDefeats || [],
            globalStats: d.globalStats || null
          });
        }
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        console.error("Leaderboard fetch error:", e);
        setData({ fastestGuesses: [], aiDefeats: [], globalStats: null });
        setLoading(false);
      });

    loadLeaderboard();
    const refreshTimer = setInterval(loadLeaderboard, 15000);
    return () => {
      cancelled = true;
      clearInterval(refreshTimer);
    };
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="ipl-container" style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      {/* Background glow effects */}
      <div style={{ position: "absolute", top: "-10%", left: "-10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(0,210,211,0.15) 0%, rgba(0,0,0,0) 70%)", filter: "blur(60px)", zIndex: 0, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "40vw", height: "40vw", background: "radial-gradient(circle, rgba(255,71,87,0.15) 0%, rgba(0,0,0,0) 70%)", filter: "blur(60px)", zIndex: 0, pointerEvents: "none" }} />
      
      {/* Navbar */}
      <nav className="ipl-navbar" style={{ position: "relative", zIndex: 10 }}>
        <div className="ipl-nav-logo">
          <span className="ipl-nav-logo-icon">🏏</span>
          <span className="ipl-nav-logo-text">IPL<span style={{ color: "var(--ipl-accent)" }}>Mind</span></span>
        </div>
        <div className="ipl-nav-links">
          <Link href="/" className="ipl-nav-link">Home</Link>
          <span className="ipl-nav-link" style={{ color: "var(--ipl-accent)", borderBottom: "2px solid var(--ipl-accent)" }}>Leaderboard</span>
        </div>
      </nav>

      <main className="ipl-main" style={{ marginTop: 80, padding: "20px 5%", position: "relative", zIndex: 10 }}>
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="ipl-hero" style={{ minHeight: "auto", padding: "40px 20px", marginBottom: 40, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 24 }}
        >
          <div className="ipl-hero-content">
            <h1 className="ipl-hero-title" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", letterSpacing: "-1px" }}>
              GLOBAL <span className="ipl-gradient-text" style={{ textShadow: "0 0 40px rgba(0,210,211,0.4)" }}>LEADERBOARD</span>
            </h1>
            <p className="ipl-hero-subtitle" style={{ color: "#a0aec0", maxWidth: 600, margin: "0 auto" }}>Real-time statistics of AI vs Human matches across the world.</p>
          </div>
        </motion.div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "30vh" }}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
              style={{ width: 40, height: 40, border: "4px solid rgba(0,210,211,0.2)", borderTopColor: "var(--ipl-accent)", borderRadius: "50%" }}
            />
          </div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 30, maxWidth: 1400, margin: "0 auto" }}
          >
            {/* AI Defeats Column */}
            <motion.div variants={itemVariants} className="ipl-card" style={{ padding: 24, background: "linear-gradient(180deg, rgba(20,25,35,0.8) 0%, rgba(10,15,25,0.9) 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,215,0,0.15)", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <h3 style={{ fontSize: 22, color: "#ffd700", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                🏆 Top AI Defeats
              </h3>
              <p style={{ color: "var(--ipl-text-muted)", fontSize: 14, marginBottom: 25 }}>
                Players who successfully stumped the AI engine.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <AnimatePresence>
                  {(data.aiDefeats || []).length > 0 ? data.aiDefeats.map((defeat, i) => (
                    <motion.div 
                      key={defeat.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255,215,0,0.08)" }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "16px 20px", borderRadius: 12, borderLeft: i === 0 ? "4px solid #ffd700" : "4px solid rgba(255,215,0,0.3)", borderTop: "1px solid rgba(255,255,255,0.03)", transition: "all 0.2s ease", cursor: "default" }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 4 }}>{defeat.player}</div>
                        <div style={{ fontSize: 13, color: "var(--ipl-text-muted)" }}>Survived <span style={{ color: "#ffd700" }}>{defeat.questions}</span> questions</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "#ff4757", fontWeight: 800, fontSize: 14, textTransform: "uppercase", letterSpacing: "1px" }}>AI Failed</div>
                        <div style={{ fontSize: 12, color: "var(--ipl-text-muted)", marginTop: 4 }}>Score: {defeat.difficultyScore}</div>
                      </div>
                    </motion.div>
                  )) : (
                    <div style={{ textAlign: "center", color: "var(--ipl-text-muted)", padding: "40px 0" }}>No AI defeats yet.</div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Fastest Guesses Column */}
            <motion.div variants={itemVariants} className="ipl-card" style={{ padding: 24, background: "linear-gradient(180deg, rgba(20,25,35,0.8) 0%, rgba(10,15,25,0.9) 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(0,210,211,0.15)", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <h3 style={{ fontSize: 22, color: "var(--ipl-accent)", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                ⚡ Fastest AI Guesses
              </h3>
              <p style={{ color: "var(--ipl-text-muted)", fontSize: 14, marginBottom: 25 }}>
                The quickest logical deductions by IPLMind.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <AnimatePresence>
                  {(data.fastestGuesses || []).length > 0 ? data.fastestGuesses.map((guess, i) => (
                    <motion.div 
                      key={guess.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(0,210,211,0.08)" }}
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.4)", padding: "16px 20px", borderRadius: 12, borderLeft: i === 0 ? "4px solid var(--ipl-accent)" : "4px solid rgba(0,210,211,0.3)", borderTop: "1px solid rgba(255,255,255,0.03)", transition: "all 0.2s ease", cursor: "default" }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, color: "white", marginBottom: 4 }}>{guess.player}</div>
                        <div style={{ fontSize: 13, color: "var(--ipl-text-muted)" }}>Score: <span style={{ color: "var(--ipl-accent)" }}>{guess.score} pts</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: "var(--ipl-accent)", fontWeight: 800, fontSize: 18 }}>{guess.questions}</div>
                        <div style={{ fontSize: 11, color: "var(--ipl-text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>Qs Asked</div>
                      </div>
                    </motion.div>
                  )) : (
                    <div style={{ textAlign: "center", color: "var(--ipl-text-muted)", padding: "40px 0" }}>No matches yet.</div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Global Stats Column */}
            <motion.div variants={itemVariants} className="ipl-card" style={{ padding: 24, background: "linear-gradient(180deg, rgba(20,25,35,0.8) 0%, rgba(10,15,25,0.9) 100%)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 24, boxShadow: "0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
              <h3 style={{ fontSize: 22, color: "white", marginBottom: 25, display: "flex", alignItems: "center", gap: 10 }}>
                🌍 Global Stats
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 35 }}>
                <motion.div whileHover={{ y: -5 }} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", padding: "20px 15px", borderRadius: 16, textAlign: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "white", marginBottom: 5 }}>{data.globalStats?.totalGames || 0}</div>
                  <div style={{ fontSize: 13, color: "#a0aec0", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>Total Matches</div>
                </motion.div>
                <motion.div whileHover={{ y: -5 }} style={{ background: "rgba(0,210,211,0.05)", border: "1px solid rgba(0,210,211,0.15)", padding: "20px 15px", borderRadius: 16, textAlign: "center", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: "var(--ipl-accent)", marginBottom: 5 }}>{data.globalStats?.aiWinRate || 0}%</div>
                  <div style={{ fontSize: 13, color: "var(--ipl-accent)", textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600, opacity: 0.8 }}>AI Win Rate</div>
                </motion.div>
              </div>

              <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,0.05)" }}>
                <h4 style={{ color: "white", marginBottom: 15, fontSize: 15, fontWeight: 600, display: "flex", justifyContent: "space-between" }}>
                  <span>Most Difficult Players</span>
                  <span style={{ fontSize: 12, color: "var(--ipl-text-muted)", fontWeight: 400 }}>AI Misses</span>
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {data.globalStats?.mostDifficultPlayers?.length > 0 ? (
                    data.globalStats.mostDifficultPlayers.map((p, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ color: "var(--ipl-text-muted)", fontSize: 13, width: 20 }}>{i+1}.</span>
                          <span style={{ color: "white", fontSize: 15, fontWeight: 500 }}>{p.name}</span>
                        </div>
                        <div style={{ background: "rgba(255,71,87,0.1)", color: "#ff4757", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          {p.misses}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: 14, color: "var(--ipl-text-muted)", textAlign: "center", padding: "10px 0" }}>Not enough data yet.</div>
                  )}
                </div>
              </div>
            </motion.div>

          </motion.div>
        )}
      </main>
    </div>
  );
}
