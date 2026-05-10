"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "../app/ipl-stadium.css"; // Ensure IPL stadium styles are loaded

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

  return (
    <div className="ipl-container">
      {/* Navbar */}
      <nav className="ipl-navbar">
        <div className="ipl-nav-logo">
          <span className="ipl-nav-logo-icon">🏏</span>
          <span className="ipl-nav-logo-text">IPL<span style={{ color: "var(--ipl-accent)" }}>Mind</span></span>
        </div>
        <div className="ipl-nav-links">
          <Link href="/" className="ipl-nav-link">Home</Link>
          <span className="ipl-nav-link" style={{ color: "var(--ipl-accent)", borderBottom: "2px solid var(--ipl-accent)" }}>Leaderboard</span>
        </div>
      </nav>

      <main className="ipl-main" style={{ marginTop: 80, padding: 20 }}>
        <div className="ipl-hero" style={{ minHeight: "auto", padding: "40px 20px" }}>
          <div className="ipl-hero-content">
            <h1 className="ipl-hero-title">
              GLOBAL <span className="ipl-gradient-text">LEADERBOARD</span>
            </h1>
            <p className="ipl-hero-subtitle">Real-time statistics of AI vs Human matches.</p>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 50, color: "var(--ipl-text-muted)" }}>
            Loading live stats...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30, maxWidth: 1200, margin: "0 auto", marginTop: 40 }}>
            
            {/* AI Defeats Column */}
            <div className="ipl-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 20, color: "var(--ipl-accent)", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10 }}>
                🏆 Top AI Defeats
              </h3>
              <p style={{ color: "var(--ipl-text-muted)", fontSize: 13, marginBottom: 20 }}>
                Players who successfully stumped the AI engine.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.aiDefeats.length > 0 ? data.aiDefeats.map((defeat, i) => (
                  <div key={defeat.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", padding: "12px 16px", borderRadius: 8, borderLeft: i === 0 ? "3px solid #ffd700" : "3px solid var(--ipl-border)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{defeat.player}</div>
                      <div style={{ fontSize: 12, color: "var(--ipl-text-muted)" }}>Survived {defeat.questions} questions</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#ff4757", fontWeight: "bold" }}>AI Failed</div>
                      <div style={{ fontSize: 12, color: "var(--ipl-text-muted)" }}>Diff: {defeat.difficultyScore}</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: "var(--ipl-text-muted)" }}>No AI defeats yet.</div>
                )}
              </div>
            </div>

            {/* Fastest Guesses Column */}
            <div className="ipl-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 20, color: "var(--ipl-accent)", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10 }}>
                ⚡ Fastest AI Guesses
              </h3>
              <p style={{ color: "var(--ipl-text-muted)", fontSize: 13, marginBottom: 20 }}>
                The quickest logical deductions by IPLMind.
              </p>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {data.fastestGuesses.length > 0 ? data.fastestGuesses.map((guess, i) => (
                  <div key={guess.id} style={{ display: "flex", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", padding: "12px 16px", borderRadius: 8, borderLeft: i === 0 ? "3px solid #00d2d3" : "3px solid var(--ipl-border)" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{guess.player}</div>
                      <div style={{ fontSize: 12, color: "var(--ipl-text-muted)" }}>Score: {guess.score} pts</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#00d2d3", fontWeight: "bold" }}>{guess.questions} Qs</div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: "center", color: "var(--ipl-text-muted)" }}>No matches yet.</div>
                )}
              </div>
            </div>

            {/* Global Stats Column */}
            <div className="ipl-card" style={{ padding: 20 }}>
              <h3 style={{ fontSize: 20, color: "var(--ipl-accent)", marginBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 10 }}>
                🌍 Global Stats
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginBottom: 30 }}>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: 15, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: "white" }}>{data.globalStats?.totalGames || 0}</div>
                  <div style={{ fontSize: 12, color: "var(--ipl-text-muted)" }}>Total Matches</div>
                </div>
                <div style={{ background: "rgba(0,0,0,0.3)", padding: 15, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: "bold", color: "var(--ipl-accent)" }}>{data.globalStats?.aiWinRate || 0}%</div>
                  <div style={{ fontSize: 12, color: "var(--ipl-text-muted)" }}>AI Win Rate</div>
                </div>
              </div>

              <h4 style={{ color: "var(--ipl-text)", marginBottom: 15, fontSize: 14 }}>Most Difficult Players to Guess:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.globalStats?.mostDifficultPlayers?.length > 0 ? (
                  data.globalStats.mostDifficultPlayers.map((p, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                      <span>{i+1}. {p.name}</span>
                      <span style={{ color: "#ff4757" }}>{p.misses} misses</span>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: 14, color: "var(--ipl-text-muted)" }}>Not enough data yet.</div>
                )}
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
