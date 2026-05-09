"use client";

import { useTheme, THEMES } from "./ThemeProvider";
import { useState } from "react";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch theme"
        className="theme-switcher-btn"
      >
        <span style={{ fontSize: 18 }}>
          {THEMES.find((t) => t.id === theme)?.emoji || "☀️"}
        </span>
      </button>

      {open && (
        <div className="theme-dropdown">
          {THEMES.map((t) => (
            <button
              key={t.id}
              className={`theme-option ${theme === t.id ? "active" : ""}`}
              onClick={() => {
                setTheme(t.id);
                setOpen(false);
              }}
            >
              <span style={{ fontSize: 16 }}>{t.emoji}</span>
              <span>{t.label}</span>
              {theme === t.id && <span style={{ marginLeft: "auto" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
