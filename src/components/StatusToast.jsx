import { useEffect } from "react";
import { useC } from "../ThemeProvider";

export const StatusToast = ({ message, type = "info", onDismiss, duration = 3000 }) => {
  const C = useC();
  const COLORS = {
    info: { bg: C.blueDim, border: C.blue, text: C.blue },
    success: { bg: C.accentGlow, border: C.accent, text: C.accent },
    warning: { bg: `${C.warn}15`, border: C.warn, text: C.warn },
    error: { bg: C.dangerDim, border: C.danger, text: C.danger },
  };
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const colors = COLORS[type] || COLORS.info;

  return (
    <div role="status" aria-live="polite" style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 1000,
      padding: "10px 18px", borderRadius: 10,
      background: colors.bg, border: `1px solid ${colors.border}30`,
      color: colors.text, fontSize: 12, fontWeight: 600,
      fontFamily: "'JetBrains Mono', monospace",
      boxShadow: `0 4px 16px ${C.bg}60`,
      animation: "slideUp 0.2s ease",
      maxWidth: 320,
    }}>
      {message}
    </div>
  );
};
