"use client";

import { useTheme, THEMES } from "./ThemeProvider";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <motion.button
        onClick={() => setOpen(!open)}
        aria-label="Switch theme"
        className="theme-switcher-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span style={{ fontSize: 18, filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }}>
          {THEMES.find((t) => t.id === theme)?.emoji || "☀️"}
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div 
            className="theme-dropdown"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {THEMES.map((t) => (
              <motion.button
                key={t.id}
                className={`theme-option ${theme === t.id ? "active" : ""}`}
                onClick={() => {
                  setTheme(t.id);
                  setOpen(false);
                }}
                whileHover={{ x: 4, backgroundColor: "var(--theme-option-hover, rgba(100,100,255,0.1))" }}
                transition={{ duration: 0.15 }}
              >
                <span className="theme-option-emoji">{t.emoji}</span>
                <span className="theme-option-label">{t.label}</span>
                {theme === t.id && (
                  <motion.span 
                    initial={{ scale: 0, rotate: -45 }}
                    animate={{ scale: 1, rotate: 0 }}
                    style={{ marginLeft: "auto", color: "var(--primary, #c084fc)" }}
                  >
                    ✓
                  </motion.span>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
