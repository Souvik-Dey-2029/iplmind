"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeSwitcher from "./ThemeSwitcher";

// ═══════════════════════════════════════════════
// FLOATING CRICKET OBJECTS — lightweight pseudo-3D
// Each object has independent animation timing for organic feel
// ═══════════════════════════════════════════════
const FLOATING_OBJECTS = [
  { emoji: "🏏", size: 44, x: "8%",  y: "18%", duration: 5.5, delay: 0,   rotate: 15,  drift: 12 },
  { emoji: "🏏", size: 32, x: "85%", y: "25%", duration: 6.2, delay: 0.8, rotate: -20, drift: 10 },
  { emoji: "🔴", size: 24, x: "12%", y: "65%", duration: 4.8, delay: 0.3, rotate: 360, drift: 8  },
  { emoji: "🔴", size: 18, x: "78%", y: "70%", duration: 5.0, delay: 1.2, rotate: -360,drift: 6  },
  { emoji: "🥅", size: 36, x: "92%", y: "55%", duration: 7.0, delay: 0.5, rotate: 8,   drift: 14 },
  { emoji: "⭐", size: 16, x: "20%", y: "40%", duration: 3.5, delay: 0.2, rotate: 180, drift: 5  },
  { emoji: "⭐", size: 14, x: "72%", y: "15%", duration: 4.0, delay: 1.0, rotate: -180,drift: 7  },
  { emoji: "🎯", size: 20, x: "55%", y: "80%", duration: 5.8, delay: 0.6, rotate: 90,  drift: 9  },
];

function FloatingObject({ emoji, size, x, y, duration, delay, rotate, drift }) {
  return (
    <motion.div
      className="ipl-floating-object"
      style={{
        position: "absolute",
        left: x,
        top: y,
        fontSize: size,
        zIndex: 1,
        willChange: "transform",
        pointerEvents: "none",
        filter: "drop-shadow(0 0 8px rgba(100,80,255,0.3))",
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: [0, 0.7, 0.5, 0.7],
        y: [0, -drift, drift * 0.5, 0],
        x: [0, drift * 0.3, -drift * 0.3, 0],
        rotate: [0, rotate * 0.3, rotate * 0.6, rotate],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        repeatType: "loop",
        ease: "easeInOut",
      }}
    >
      {emoji}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════
// STADIUM LIGHT BEAM — animated sweeping beam
// ═══════════════════════════════════════════════
function StadiumLightBeam({ side }) {
  const isLeft = side === "left";
  return (
    <motion.div
      className="ipl-light-beam"
      style={{
        position: "absolute",
        top: "-10%",
        [isLeft ? "left" : "right"]: "5%",
        width: "300px",
        height: "120%",
        background: `conic-gradient(from ${isLeft ? "200deg" : "340deg"} at 50% 0%, transparent 0deg, rgba(192,132,252,0.06) 15deg, rgba(192,132,252,0.12) 25deg, rgba(192,132,252,0.06) 35deg, transparent 50deg)`,
        transformOrigin: "top center",
        pointerEvents: "none",
        zIndex: 0,
        willChange: "transform",
      }}
      animate={{
        rotate: isLeft ? [-15, -5, -15] : [15, 5, 15],
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: 8,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

// ═══════════════════════════════════════════════
// NEON STREAK — horizontal animated accent line
// ═══════════════════════════════════════════════
function NeonStreak({ top, delay, width, color }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        top,
        left: "0",
        width: width || "100%",
        height: "1px",
        background: `linear-gradient(90deg, transparent, ${color || "rgba(192,132,252,0.3)"}, transparent)`,
        pointerEvents: "none",
        zIndex: 1,
      }}
      animate={{
        opacity: [0, 0.8, 0],
        x: ["-100%", "100%"],
      }}
      transition={{
        duration: 6,
        delay: delay || 0,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

// ═══════════════════════════════════════════════
// PULSE RING — expanding ring effect behind trophy
// ═══════════════════════════════════════════════
function PulseRing({ delay = 0 }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        border: "1px solid rgba(255,200,0,0.15)",
        top: 0,
        left: 0,
      }}
      animate={{
        scale: [0.8, 1.8],
        opacity: [0.4, 0],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
export default function IPLStadiumHome({ onStartGame }) {
  const [isMobile, setIsMobile] = useState(false);
  const [trophyHover, setTrophyHover] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 900);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <div className="ipl-stadium-bg" style={{ position: "relative" }}>

      {/* ═══ Animated Stadium Light Beams ═══ */}
      {!isMobile && (
        <>
          <StadiumLightBeam side="left" />
          <StadiumLightBeam side="right" />
        </>
      )}

      {/* ═══ Neon Streaks ═══ */}
      <NeonStreak top="30%" delay={0} color="rgba(192,132,252,0.25)" />
      <NeonStreak top="60%" delay={3} color="rgba(255,140,0,0.2)" />
      {!isMobile && <NeonStreak top="85%" delay={5} color="rgba(0,200,255,0.15)" />}

      {/* ═══ Floating Cricket Objects ═══ */}
      {FLOATING_OBJECTS.slice(0, isMobile ? 4 : 8).map((obj, i) => (
        <FloatingObject key={i} {...obj} />
      ))}

      {/* ═══ Header ═══ */}
      <header className="ipl-header" style={{ position: "sticky", top: 0, zIndex: 50 }}>
        <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto", padding: "12px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="ipl-logo" style={{ fontSize: "28px" }}>IPL Genius</span>
          </div>
          {!isMobile && (
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <span className="ipl-nav-link active">Predict</span>
              <span className="ipl-nav-link">Leaderboard</span>
              <span className="ipl-nav-link">History</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <ThemeSwitcher />
          </div>
        </nav>
      </header>

      {/* ═══════════════════════════════════════════════
           HERO SECTION — Cinematic Cricket Intro
           ═══════════════════════════════════════════════ */}
      <div className="ipl-landing-hero">

        {/* ═══ Left: Animated Batsman Silhouette ═══ */}
        {!isMobile && (
          <motion.div
            className="ipl-hero-silhouette ipl-hero-batsman"
            initial={{ opacity: 0, x: -80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <motion.div
              animate={{ y: [0, -10, 0], rotateZ: [0, 1.5, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              style={{ width: "100%", height: "100%" }}
            >
              {/* Layered SVG batsman with glow */}
              <svg viewBox="0 0 200 380" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 0 20px rgba(192,132,252,0.4))" }}>
                {/* Body */}
                <ellipse cx="100" cy="60" rx="22" ry="26" fill="url(#batsmanHead)" />
                <path d="M80 85 Q100 75 120 85 L125 160 Q100 170 75 160 Z" fill="url(#batsmanBody)" />
                {/* Legs */}
                <path d="M85 158 L75 280 Q78 290 85 285 L92 160Z" fill="rgba(129,140,248,0.5)" />
                <path d="M108 158 L118 275 Q122 285 115 283 L105 160Z" fill="rgba(129,140,248,0.45)" />
                {/* Bat */}
                <rect x="128" y="95" width="8" height="90" rx="3" fill="url(#batGrad)" transform="rotate(25, 132, 140)" />
                <rect x="125" y="180" width="14" height="35" rx="4" fill="url(#batBlade)" transform="rotate(25, 132, 195)" />
                {/* Helmet visor glow */}
                <ellipse cx="100" cy="52" rx="18" ry="8" fill="rgba(192,132,252,0.15)" />
                <defs>
                  <linearGradient id="batsmanHead" x1="80" y1="34" x2="120" y2="86">
                    <stop offset="0%" stopColor="rgba(192,132,252,0.6)" />
                    <stop offset="100%" stopColor="rgba(129,140,248,0.4)" />
                  </linearGradient>
                  <linearGradient id="batsmanBody" x1="75" y1="85" x2="125" y2="160">
                    <stop offset="0%" stopColor="rgba(192,132,252,0.55)" />
                    <stop offset="100%" stopColor="rgba(99,80,220,0.35)" />
                  </linearGradient>
                  <linearGradient id="batGrad" x1="128" y1="95" x2="136" y2="185">
                    <stop offset="0%" stopColor="rgba(255,200,0,0.7)" />
                    <stop offset="100%" stopColor="rgba(255,140,0,0.5)" />
                  </linearGradient>
                  <linearGradient id="batBlade" x1="125" y1="180" x2="139" y2="215">
                    <stop offset="0%" stopColor="rgba(255,220,100,0.8)" />
                    <stop offset="100%" stopColor="rgba(255,180,50,0.6)" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>
        )}

        {/* ═══ Center: Hero Text + CTA ═══ */}
        <motion.div
          className="ipl-landing-center"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
        >
          {/* Decorative badge */}
          <motion.div
            className="ipl-hero-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 18px", borderRadius: 20, background: "rgba(100,80,255,0.12)", border: "1px solid rgba(100,80,255,0.25)", color: "#c084fc", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              ⚡ AI-Powered Cricket Intelligence
            </span>
          </motion.div>

          {/* Main headline with staggered entrance */}
          <motion.h1
            className="ipl-hero-headline"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Think of any<br />
            <motion.span
              animate={{
                textShadow: [
                  "0 0 20px rgba(255,140,0,0.3)",
                  "0 0 40px rgba(255,140,0,0.5)",
                  "0 0 20px rgba(255,140,0,0.3)",
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              IPL player.
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            style={{ color: "rgba(200,200,255,0.55)", fontSize: "clamp(14px,2vw,17px)", margin: "0 auto 32px", lineHeight: 1.7, maxWidth: 480 }}
          >
            The ultimate AI that reads your mind using 15 years of legendary IPL stats, hidden patterns, and adaptive intelligence.
          </motion.p>

          {/* CTA Button with glow pulse */}
          <motion.button
            className="ipl-btn-primary ipl-hero-cta"
            onClick={onStartGame}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            whileHover={{ scale: 1.05, boxShadow: "0 0 60px rgba(255,140,0,0.6), 0 15px 50px rgba(255,85,0,0.35)" }}
            whileTap={{ scale: 0.97 }}
          >
            <motion.span
              animate={{ opacity: [1, 0.7, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              START GAME ⚡
            </motion.span>
          </motion.button>

          {/* Live indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            style={{ marginTop: 20, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, color: "rgba(200,200,255,0.35)", fontSize: 12 }}
          >
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }}
            />
            842 players in database • AI ready
          </motion.div>
        </motion.div>

        {/* ═══ Right: Floating 3D Trophy ═══ */}
        {!isMobile && (
          <motion.div
            className="ipl-hero-silhouette ipl-hero-trophy-wrap"
            initial={{ opacity: 0, x: 80 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 }}
            onMouseEnter={() => setTrophyHover(true)}
            onMouseLeave={() => setTrophyHover(false)}
            style={{ position: "relative", cursor: "pointer" }}
          >
            {/* Pulse rings behind trophy */}
            <div style={{ position: "absolute", width: 280, height: 280, top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
              <PulseRing delay={0} />
              <PulseRing delay={1} />
              <PulseRing delay={2} />
            </div>

            {/* Trophy with floating + rotation */}
            <motion.div
              animate={{
                y: [0, -14, 0],
                rotateY: trophyHover ? [0, 15, 0] : [0, 8, -8, 0],
                scale: trophyHover ? 1.08 : 1,
              }}
              transition={{
                y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                rotateY: { duration: trophyHover ? 0.6 : 6, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 0.3 },
              }}
              style={{ perspective: 800, transformStyle: "preserve-3d", position: "relative", zIndex: 2 }}
            >
              <svg viewBox="0 0 200 320" fill="none" xmlns="http://www.w3.org/2000/svg"
                style={{
                  width: 260,
                  height: 340,
                  filter: trophyHover
                    ? "drop-shadow(0 0 40px rgba(255,200,0,0.6)) drop-shadow(0 20px 40px rgba(255,140,0,0.3))"
                    : "drop-shadow(0 0 25px rgba(255,200,0,0.35)) drop-shadow(0 15px 30px rgba(255,140,0,0.15))",
                  transition: "filter 0.3s ease",
                }}
              >
                {/* Trophy cup */}
                <path d="M60 80 Q60 140 100 160 Q140 140 140 80 Z" fill="url(#trophyCup)" />
                {/* Left handle */}
                <path d="M60 85 Q30 85 30 115 Q30 145 60 145" stroke="url(#handleGrad)" strokeWidth="6" fill="none" />
                {/* Right handle */}
                <path d="M140 85 Q170 85 170 115 Q170 145 140 145" stroke="url(#handleGrad)" strokeWidth="6" fill="none" />
                {/* Rim */}
                <ellipse cx="100" cy="78" rx="42" ry="8" fill="rgba(255,240,180,0.9)" />
                {/* Stem */}
                <rect x="92" y="160" width="16" height="50" rx="3" fill="url(#stemGrad)" />
                {/* Base */}
                <ellipse cx="100" cy="220" rx="35" ry="10" fill="url(#baseGrad)" />
                <rect x="70" y="210" width="60" height="16" rx="4" fill="url(#baseGrad2)" />
                {/* Star emblem */}
                <text x="100" y="128" textAnchor="middle" fontSize="24" fill="rgba(255,255,255,0.8)">★</text>
                {/* Reflection highlight */}
                <path d="M75 90 Q80 120 85 145" stroke="rgba(255,255,255,0.25)" strokeWidth="3" fill="none" strokeLinecap="round" />
                {/* Glow ring at top */}
                <ellipse cx="100" cy="78" rx="44" ry="10" stroke="rgba(255,200,0,0.2)" strokeWidth="1" fill="none" />

                <defs>
                  <linearGradient id="trophyCup" x1="60" y1="80" x2="140" y2="160">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="50%" stopColor="#ffb800" />
                    <stop offset="100%" stopColor="#ff8c00" />
                  </linearGradient>
                  <linearGradient id="handleGrad" x1="30" y1="85" x2="30" y2="145">
                    <stop offset="0%" stopColor="#ffd700" />
                    <stop offset="100%" stopColor="#cc8800" />
                  </linearGradient>
                  <linearGradient id="stemGrad" x1="92" y1="160" x2="108" y2="210">
                    <stop offset="0%" stopColor="#cc8800" />
                    <stop offset="100%" stopColor="#8B6914" />
                  </linearGradient>
                  <linearGradient id="baseGrad" x1="65" y1="210" x2="135" y2="230">
                    <stop offset="0%" stopColor="#8B6914" />
                    <stop offset="100%" stopColor="#6B4F10" />
                  </linearGradient>
                  <linearGradient id="baseGrad2" x1="70" y1="210" x2="130" y2="226">
                    <stop offset="0%" stopColor="#a07820" />
                    <stop offset="50%" stopColor="#c09430" />
                    <stop offset="100%" stopColor="#a07820" />
                  </linearGradient>
                </defs>
              </svg>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* ═══ Bottom Stats Row ═══ */}
      <motion.div
        className="ipl-landing-stats"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.7 }}
      >
        {[
          { icon: "📈", value: "12", label: "Avg. Questions", glow: "ipl-glow-cyan" },
          { icon: "🎯", value: "98.2%", label: "AI Accuracy", glow: "ipl-glow-orange" },
          { icon: "🏆", value: "15", label: "Seasons Data", glow: "ipl-glow" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className={`ipl-stat-card ${stat.glow}`}
            whileHover={{ y: -4, boxShadow: "0 0 35px rgba(100,80,255,0.2)" }}
            transition={{ duration: 0.25 }}
          >
            <div className="ipl-stat-icon">{stat.icon}</div>
            <div>
              <div className="ipl-stat-value">{stat.value}</div>
              <div className="ipl-stat-label">{stat.label}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ═══ HUD Accent Lines (desktop only) ═══ */}
      {!isMobile && (
        <>
          {/* Corner brackets */}
          <div style={{ position: "absolute", top: 100, left: 30, width: 40, height: 40, borderLeft: "2px solid rgba(192,132,252,0.15)", borderTop: "2px solid rgba(192,132,252,0.15)", pointerEvents: "none", zIndex: 1 }} />
          <div style={{ position: "absolute", top: 100, right: 30, width: 40, height: 40, borderRight: "2px solid rgba(192,132,252,0.15)", borderTop: "2px solid rgba(192,132,252,0.15)", pointerEvents: "none", zIndex: 1 }} />
          <div style={{ position: "absolute", bottom: 60, left: 30, width: 40, height: 40, borderLeft: "2px solid rgba(255,140,0,0.1)", borderBottom: "2px solid rgba(255,140,0,0.1)", pointerEvents: "none", zIndex: 1 }} />
          <div style={{ position: "absolute", bottom: 60, right: 30, width: 40, height: 40, borderRight: "2px solid rgba(255,140,0,0.1)", borderBottom: "2px solid rgba(255,140,0,0.1)", pointerEvents: "none", zIndex: 1 }} />
        </>
      )}
    </div>
  );
}
