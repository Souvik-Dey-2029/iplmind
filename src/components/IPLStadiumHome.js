"use client";
import React from "react";
import ThemeSwitcher from "./ThemeSwitcher";

export default function IPLStadiumHome({ onStartGame }) {
  return (
    <div className="ipl-stadium-bg">
      {/* Header */}
      <header className="ipl-header" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="ipl-logo" style={{ fontSize: "28px" }}>IPL Genius</span>
          </div>
          <div style={{ display: "flex", gap: 32, alignItems: "center", display: window?.innerWidth > 768 ? "flex" : "none" }}>
            <span className="ipl-nav-link active">Predict</span>
            <span className="ipl-nav-link">Leaderboard</span>
            <span className="ipl-nav-link">History</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ThemeSwitcher />
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(15,12,40,0.6)", padding: "6px 12px", borderRadius: "20px", border: "1px solid rgba(100,80,255,0.2)" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #c084fc, #818cf8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>👤</div>
              <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>Guest</span>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section (Image 2 Layout) */}
      <div className="ipl-landing-hero">
        {/* Left Side: Batsman Silhouette */}
        <div className="ipl-landing-batsman"></div>

        {/* Center: Main Content */}
        <div className="ipl-landing-center">
          <h1>Think of any<br /><span>IPL player.</span></h1>
          <p>The ultimate AI that guesses your favorite IPL player based on 15 years of legendary stats and matches.</p>
          <button className="ipl-btn-primary" onClick={onStartGame} style={{ marginTop: 20, padding: "18px 48px", fontSize: 20 }}>
            START GAME ⚡
          </button>
        </div>

        {/* Right Side: Trophy */}
        <div className="ipl-landing-trophy"></div>
      </div>

      {/* Bottom Stats Row */}
      <div className="ipl-landing-stats">
        <div className="ipl-stat-card ipl-glow-cyan">
          <div className="ipl-stat-icon">📈</div>
          <div>
            <div className="ipl-stat-value">12</div>
            <div className="ipl-stat-label">Avg. Questions</div>
          </div>
        </div>
        <div className="ipl-stat-card ipl-glow-orange">
          <div className="ipl-stat-icon">🎯</div>
          <div>
            <div className="ipl-stat-value">98.2%</div>
            <div className="ipl-stat-label">AI Accuracy</div>
          </div>
        </div>
        <div className="ipl-stat-card ipl-glow">
          <div className="ipl-stat-icon">🏆</div>
          <div>
            <div className="ipl-stat-value">15</div>
            <div className="ipl-stat-label">Seasons Data</div>
          </div>
        </div>
      </div>
      
      {/* Decorative floodlights */}
      <div className="ipl-floodlight left"></div>
      <div className="ipl-floodlight right"></div>
    </div>
  );
}
