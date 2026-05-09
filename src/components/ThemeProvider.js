"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  themes: [],
});

export const THEMES = [
  { id: "light", label: "Light", emoji: "☀️" },
  { id: "dark", label: "Dark", emoji: "🌙" },
  { id: "ipl", label: "IPL Stadium", emoji: "🏟️" },
];

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState("ipl");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("iplmind-theme") || "ipl";
    setThemeState(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    localStorage.setItem("iplmind-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div style={{ visibility: "hidden" }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
