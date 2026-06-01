import { C } from "../theme";
import { getTier, getStatusColor } from "../utils";
import { Pill } from "./Pill";
import { ScoreBar } from "./ScoreBar";
import { FeatureHistory } from "./FeatureHistory";

export const CandidateDetail = ({ feature, maxScore, onEdit, onDelete, onDeselect, isSignedIn, activeWsId, onRevert, signals, onScreenChange }) => {
  const linkedSignals = (signals || []).filter(s => s.linked_candidate_id === feature.id);
  const tier = getTier(feature);
  const statusColor = feature.status ? getStatusColor(feature.status) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Pill color={tier.color} dimColor={tier.color + "20"}>{tier.label}</Pill>
        <button onClick={onDeselect} style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>✕ Close</button>
      </div>

      <div>
        <span style={{ fontSize: 28, fontWeight: 800, color: tier.color, fontFamily: "'JetBrains Mono', monospace" }}>{feature.score.toLocaleString()}</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, margin: "8px 0 0" }}>{feature.name}</h3>
        {feature.description && <p style={{ fontSize: 12, color: C.textMuted, margin: "6px 0 0", lineHeight: 1.6 }}>{feature.description}</p>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>RICE SCORES</span>
        <ScoreBar value={feature.reach} color={C.accent} label="R" />
        <ScoreBar value={feature.impact} color={C.blue} label="I" />
        <ScoreBar value={feature.confidence} color={C.purple} label="C" />
        <ScoreBar value={feature.effort} color={C.warn} label="E" />
        <div style={{ padding: "6px 0", marginTop: 2 }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
            (<span style={{ color: C.accent }}>{feature.reach}</span> × <span style={{ color: C.blue }}>{feature.impact}</span> × <span style={{ color: C.purple }}>{feature.confidence}</span>) ÷ <span style={{ color: C.warn }}>{feature.effort}</span> = <span style={{ color: tier.color, fontWeight: 700 }}>{feature.score.toLocaleString()}</span>
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>METADATA</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", width: 50 }}>Owner</span>
          <span style={{ fontSize: 11, color: feature.owner ? C.text : C.textDim }}>{feature.owner || "Unassigned"}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", width: 50 }}>Theme</span>
          {feature.theme ? (
            <span style={{ fontSize: 10, color: C.purple, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.purpleDim, borderRadius: 4 }}>{feature.theme}</span>
          ) : (
            <span style={{ fontSize: 11, color: C.textDim }}>None</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", width: 50 }}>Status</span>
          {feature.status && feature.status !== "backlog" ? (
            <Pill color={statusColor} dimColor={statusColor + "20"} small>{feature.status.toUpperCase()}</Pill>
          ) : (
            <span style={{ fontSize: 11, color: C.textDim }}>BACKLOG</span>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => onEdit(feature)} style={{ flex: 1, padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--accent) 19%, transparent)`, borderRadius: 6, background: C.blueDim, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>
          ✎ Edit
        </button>
        <button onClick={() => onDelete(feature.id)} style={{ padding: "8px 12px", border: `1px solid color-mix(in srgb, var(--danger) 19%, transparent)`, borderRadius: 6, background: C.dangerDim, color: C.danger, fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}>
          ✕ Remove
        </button>
      </div>

      {linkedSignals.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>LINKED SIGNALS</span>
            <span style={{ fontSize: 9, color: C.blue, fontFamily: "'JetBrains Mono', monospace" }}>{linkedSignals.length}</span>
          </div>
          {linkedSignals.slice(0, 3).map(s => (
            <div key={s.id} style={{ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg }}>
              <span style={{ fontSize: 11, color: C.text }}>{s.title}</span>
              {s.source && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", marginLeft: 6 }}>{s.source}</span>}
            </div>
          ))}
          {linkedSignals.length > 3 && (
            <button onClick={() => onScreenChange?.("signals")} style={{ padding: "4px 10px", border: `1px solid color-mix(in srgb, var(--accent) 13%, transparent)`, borderRadius: 6, background: "transparent", color: C.blue, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>
              View all {linkedSignals.length} signals
            </button>
          )}
        </div>
      )}

      {isSignedIn && activeWsId && (
        <FeatureHistory wsId={activeWsId} featureId={feature.id} feature={feature} onRevert={onRevert} />
      )}
    </div>
  );
};
