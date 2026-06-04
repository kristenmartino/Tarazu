import { useState, useRef, useEffect } from "react";
import { useTheme } from "../ThemeProvider";

// Appearance / contrast glyph (half-filled circle) — not color-dependent.
const ICON = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
  </svg>
);

// Top-bar theme shortcut: a labeled popover that reuses the ThemeProvider
// state (same options + persistence as the Settings picker — no duplicate
// logic). `compact` (mobile) shows the icon only. Keyboard accessible:
// button with aria-haspopup/expanded; menu items are radios with aria-checked;
// Escape and outside-click dismiss; active theme marked with ✓ (never color
// alone).
export const ThemeMenu = ({ compact = false }) => {
  const { C, themeName, setThemeName, themes } = useTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const current = themes.find((t) => t.id === themeName);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); btnRef.current?.focus(); } };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    // move focus to the active option so keyboard users land in the menu
    const raf = requestAnimationFrame(() => menuRef.current?.querySelector('[aria-checked="true"]')?.focus());
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); cancelAnimationFrame(raf); };
  }, [open]);

  const select = (id) => { setThemeName(id); setOpen(false); btnRef.current?.focus(); };

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        ref={btnRef} type="button" onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu" aria-expanded={open}
        aria-label={`Theme: ${current?.label || "select"}`} title="Appearance"
        style={{
          // reset the browser's default button chrome (was rendering a white box)
          appearance: "none", WebkitAppearance: "none", margin: 0,
          display: "flex", alignItems: "center", gap: 6, padding: "5px 10px",
          border: `1px solid ${open ? C.borderActive : C.border}`, borderRadius: 6,
          background: open ? C.surfaceAlt : "transparent", color: C.textMuted,
          fontSize: 11, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, cursor: "pointer",
        }}>
        {ICON}
        {!compact && (<>
          <span>Theme: <span style={{ color: C.text, fontWeight: 600 }}>{current?.label}</span></span>
          <span style={{ fontSize: 8, color: C.textDim }}>{open ? "▲" : "▼"}</span>
        </>)}
      </button>

      {open && (
        <div ref={menuRef} role="menu" aria-label="Theme" style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, minWidth: 190,
          background: C.overlay, border: `1px solid ${C.borderActive}`, borderRadius: 10,
          padding: 5, boxShadow: "0 10px 30px color-mix(in srgb, var(--surface-base) 55%, transparent)", zIndex: 200,
        }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.14em", color: C.textDim, fontFamily: "'JetBrains Mono', monospace", padding: "4px 9px 7px" }}>APPEARANCE</div>
          {themes.map((t) => {
            const active = t.id === themeName;
            return (
              <button
                key={t.id} type="button" role="menuitemradio" aria-checked={active}
                onClick={() => select(t.id)}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.surfaceAlt; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                  width: "100%", padding: "8px 9px", border: "none", borderRadius: 6,
                  background: active ? C.accentSubtle : "transparent",
                  color: active ? C.accent : C.text, fontSize: 13,
                  fontWeight: active ? 600 : 400, fontFamily: "var(--body)",
                  cursor: "pointer", textAlign: "left",
                }}>
                <span>{t.label}</span>
                <span aria-hidden="true" style={{ fontWeight: 800, opacity: active ? 1 : 0 }}>✓</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
