import { useState, useRef, useEffect } from "react";
import { C } from "../theme";
import { AuthButton } from "./AuthButton";

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12l9-9 9 9"/><path d="M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10"/></svg>
  ), enabled: true },
  { id: "priorities", label: "Priorities", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
  ), enabled: true },
  { id: "signals", label: "Signals", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 20h4V10H4z"/><path d="M10 20h4V4h-4z"/><path d="M16 20h4v-8h-4z"/></svg>
  ), enabled: true },
  { id: "decisions", label: "Decisions", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 3"/></svg>
  ), enabled: true },
  { id: "scenarios", label: "Scenarios", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h6"/></svg>
  ), enabled: true },
  { id: "settings", label: "Settings", icon: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41m11.32-11.32l1.41-1.41"/></svg>
  ), enabled: true },
];

// The advisor (Product Context + Decision Advisor + Feedback) lives in the
// right rail on desktop. On mobile/tablet the right rail is overlay-only, so
// it gets its own nav entry instead (#18).
const ADVISOR_ITEM = { id: "advisor", label: "Advisor", icon: (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 00-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0012 2z"/></svg>
), enabled: true };

const Logo = () => (
  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 20px ${C.blue}30`, flexShrink: 0 }}>
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="12" y1="6" x2="12" y2="20" strokeLinecap="round"/><circle cx="5" cy="6" r="2" fill={C.bg} stroke="none"/><circle cx="19" cy="6" r="2" fill={C.bg} stroke="none"/></svg>
  </div>
);

export const LeftRail = ({ activeScreen, onScreenChange, activeWs, workspaces, onSwitchWorkspace, onAddWorkspace, onDeleteWorkspace, onRenameWorkspace, isMobile, isSignedIn, advisorInNav }) => {
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!wsDropdownOpen) return;
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setWsDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [wsDropdownOpen]);

  // Mobile: bottom tab bar
  if (isMobile) {
    return (
      <div data-no-print role="navigation" aria-label="Main navigation" style={{
        position: "fixed", bottom: 0, left: 0, right: 0, height: 56,
        background: C.navBg, borderTop: `1px solid ${C.navBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-around",
        zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)",
      }}>
        {[...NAV_ITEMS.filter(n => n.id !== "settings" && n.id !== "scenarios"), ADVISOR_ITEM].map(item => (
          <button key={item.id} onClick={() => item.enabled && onScreenChange(item.id)}
            aria-current={activeScreen === item.id ? "page" : undefined}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
              padding: "6px 12px", border: "none", background: "transparent",
              color: activeScreen === item.id ? C.accent : C.textDim,
              opacity: item.enabled ? 1 : 0.35, cursor: item.enabled ? "pointer" : "default",
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
            }}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // Desktop: vertical rail
  return (
    <div data-no-print role="navigation" aria-label="Main navigation" style={{
      width: 64, height: "calc(100vh - 48px)", position: "sticky", top: 48,
      background: C.navBg, borderRight: `1px solid ${C.navBorder}`,
      display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 12px",
      gap: 8, flexShrink: 0, boxSizing: "border-box",
    }}>
      {/* Workspace switcher */}
      <div ref={dropdownRef} style={{ position: "relative", width: "100%" }}>
        <button onClick={() => setWsDropdownOpen(!wsDropdownOpen)} title={activeWs?.name || "Workspace"} style={{
          width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          padding: "10px 0", border: "none",
          background: wsDropdownOpen ? C.surface : "transparent",
          color: C.textMuted, cursor: "pointer",
          fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
          transition: "all 0.15s", borderLeft: "2px solid transparent",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span style={{ maxWidth: 56, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9 }}>{activeWs?.name || "Workspace"}</span>
          <span style={{ fontSize: 7, color: C.textDim }}>{wsDropdownOpen ? "▲" : "▼"}</span>
        </button>
        {wsDropdownOpen && (
          <div style={{
            position: "absolute", top: 0, left: "calc(100% + 8px)", minWidth: 200,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
            boxShadow: `0 8px 24px ${C.bg}80`, zIndex: 200, overflow: "hidden",
          }}>
            {workspaces.map(w => (
              <div key={w.id} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px",
                borderBottom: `1px solid ${C.border}`,
                background: w.id === activeWs?.id ? C.accentGlow : "transparent", cursor: "pointer",
              }} onClick={() => { if (w.id !== activeWs?.id) onSwitchWorkspace(w.id); setWsDropdownOpen(false); }}>
                <span style={{ flex: 1, fontSize: 12, color: w.id === activeWs?.id ? C.accent : C.text, fontWeight: w.id === activeWs?.id ? 700 : 400 }}>{w.name}</span>
                <button onClick={e => { e.stopPropagation(); onRenameWorkspace(w.id); }} style={{ padding: "2px 5px", border: "none", background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer" }} title="Rename">✎</button>
                {workspaces.length > 1 && <button onClick={e => { e.stopPropagation(); onDeleteWorkspace(w.id); }} style={{ padding: "2px 5px", border: "none", background: "transparent", color: C.danger + "80", fontSize: 10, cursor: "pointer" }} title="Delete">✕</button>}
              </div>
            ))}
            <button onClick={() => { onAddWorkspace(); setWsDropdownOpen(false); }} style={{
              width: "100%", padding: "8px 12px", border: "none", background: "transparent",
              color: C.accent, fontSize: 11, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", textAlign: "left",
            }} onMouseEnter={e => e.target.style.background = C.accentGlow} onMouseLeave={e => e.target.style.background = "transparent"}>
              + New Workspace
            </button>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4, width: "100%" }}>
        {(advisorInNav ? [...NAV_ITEMS.slice(0, -1), ADVISOR_ITEM, NAV_ITEMS[NAV_ITEMS.length - 1]] : NAV_ITEMS).map(item => {
          const isActive = activeScreen === item.id;
          return (
            <button key={item.id} onClick={() => item.enabled && onScreenChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "10px 0", border: "none", width: "100%",
                background: isActive ? C.accentGlow : "transparent",
                borderLeft: isActive ? `2px solid ${C.accent}` : "2px solid transparent",
                color: isActive ? C.accent : C.textDim,
                opacity: item.enabled ? 1 : 0.35,
                cursor: item.enabled ? "pointer" : "default",
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
                transition: "all 0.15s",
              }}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: "auto" }}>
        <AuthButton />
      </div>
    </div>
  );
};
