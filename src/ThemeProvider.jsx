"use client";
// Theme switcher infrastructure (Slice A).
// Holds the active theme name, persists it, serves the palette to inline-style
// components via useC(), and mirrors the theme's CSS-var values onto :root so
// the var(--…)-driven surfaces (landing, auth shell, tzui primitives) track the
// same theme. With only Brass registered this is a no-op; adding a theme to
// THEMES (src/theme.js) makes it selectable everywhere automatically.
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { THEMES, DEFAULT_THEME } from "./theme";

const STORAGE_KEY = "tarazu-theme";
const ThemeContext = createContext(null);

// Push a theme's `vars` onto :root. Inline styles on <html> win over the
// stylesheet's :root block, so this overrides app/tokens.css at runtime.
function applyCssVars(theme) {
  if (typeof document === "undefined" || !theme?.vars) return;
  const root = document.documentElement;
  for (const name in theme.vars) root.style.setProperty(name, theme.vars[name]);
}

export function ThemeProvider({ children }) {
  // Start from the default so SSR and first client render match (avoids a
  // hydration mismatch); the persisted choice is applied in an effect below.
  const [themeName, setThemeNameState] = useState(DEFAULT_THEME);

  // Hydrate the persisted choice once, on the client.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES[saved]) setThemeNameState(saved);
    } catch { /* localStorage unavailable — keep default */ }
  }, []);

  // Mirror the active theme onto :root whenever it changes.
  useEffect(() => {
    applyCssVars(THEMES[themeName] || THEMES[DEFAULT_THEME]);
  }, [themeName]);

  const setThemeName = useCallback((name) => {
    if (!THEMES[name]) return;
    setThemeNameState(name);
    try { localStorage.setItem(STORAGE_KEY, name); } catch { /* ignore */ }
  }, []);

  const value = useMemo(() => {
    const active = THEMES[themeName] || THEMES[DEFAULT_THEME];
    return {
      C: active.palette,
      themeName,
      themeLabel: active.label,
      setThemeName,
      themes: Object.entries(THEMES).map(([id, t]) => ({ id, label: t.label })),
    };
  }, [themeName, setThemeName]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Full theme context: { C, themeName, themeLabel, setThemeName, themes }.
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

// Just the active palette — the drop-in replacement for `import { C }`.
export function useC() {
  return useTheme().C;
}
