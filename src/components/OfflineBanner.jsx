import { useC } from "../ThemeProvider";

export const OfflineBanner = ({ isOnline, isSyncing }) => {
  const C = useC();
  if (isOnline && !isSyncing) return null;

  return (
    <div role="alert" style={{
      padding: "6px 20px",
      background: isOnline ? C.accentGlow : `${C.warn}15`,
      borderBottom: `1px solid ${isOnline ? C.accent + "30" : C.warn + "30"}`,
      display: "flex", alignItems: "center", gap: 8,
      fontSize: 11, fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace",
      color: isOnline ? C.accent : C.warn,
    }}>
      <span style={{ fontSize: 14 }}>{isOnline ? "↻" : "⚠"}</span>
      {isOnline
        ? "Back online — syncing..."
        : "You're offline — changes saved locally"}
    </div>
  );
};
