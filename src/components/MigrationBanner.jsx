import { useState } from "react";
import { useC } from "../ThemeProvider";

export const MigrationBanner = ({ onConfirm, onDismiss }) => {
  const C = useC();
  const [migrating, setMigrating] = useState(false);

  const handleConfirm = async () => {
    setMigrating(true);
    try {
      await onConfirm();
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div style={{ padding: "12px 28px", background: C.blueDim, borderBottom: `1px solid ${C.blue}30`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12, color: C.blue, fontWeight: 600 }}>Local data found</span>
      <span style={{ fontSize: 11, color: C.textMuted, flex: 1 }}>
        You have workspaces saved in this browser. Import them to your cloud account?
      </span>
      <button
        onClick={handleConfirm}
        disabled={migrating}
        style={{ padding: "5px 14px", border: "none", borderRadius: 6, background: C.blue, color: C.bg, fontSize: 11, fontWeight: 700, cursor: migrating ? "wait" : "pointer", fontFamily: "'JetBrains Mono', monospace", opacity: migrating ? 0.6 : 1 }}
      >
        {migrating ? "Importing..." : "Import"}
      </button>
      <button
        onClick={onDismiss}
        disabled={migrating}
        style={{ padding: "5px 10px", border: "none", borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}
      >
        Dismiss
      </button>
    </div>
  );
};
