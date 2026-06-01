import { C } from "../theme";
import { getTier, getStatusColor, relativeTime } from "../utils";
import { Pill } from "./Pill";
import { ScoreBar } from "./ScoreBar";

export const Card = ({ feature, rank, isSelected, onClick, onDelete, onEdit, maxScore, draggable: canDrag, onDragStart, onDragOver, onDrop, isDragging, showMoveButtons, onMove, isFirst, isLast, signalCount, updatedAt }) => {
  const { score } = feature;
  const tier = getTier(feature);
  const moveBtnStyle = (disabled) => ({ padding: "6px 10px", border: `1px solid ${C.border}`, borderRadius: 6, background: disabled ? "transparent" : C.surface, color: disabled ? C.textDim : C.warn, fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.3 : 1, lineHeight: 1 });

  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } }} draggable={canDrag} onDragStart={e => { e.dataTransfer.effectAllowed = "move"; onDragStart?.(feature.id); }} onDragOver={e => { e.preventDefault(); onDragOver?.(e); }} onDrop={() => onDrop?.(feature.id)} style={{ padding: 14, border: `1px solid ${isSelected ? tier.color + "50" : C.border}`, borderRadius: 10, background: isSelected ? tier.color + "08" : C.surface, cursor: canDrag ? "grab" : "pointer", transition: "all 0.2s", opacity: isDragging ? 0.4 : 1, animation: `fadeIn 0.2s ease both`, animationDelay: `${(rank - 1) * 30}ms` }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = C.borderActive; }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = C.border; }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        {showMoveButtons && <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0, paddingTop: 2 }}>
          <button onClick={e => { e.stopPropagation(); if (!isFirst) onMove(feature.id, -1); }} disabled={isFirst} style={moveBtnStyle(isFirst)}>▲</button>
          <button onClick={e => { e.stopPropagation(); if (!isLast) onMove(feature.id, 1); }} disabled={isLast} style={moveBtnStyle(isLast)}>▼</button>
        </div>}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>#{rank}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feature.name}</span>
          </div>
          {feature.description && <p style={{ fontSize: 11, color: C.textMuted, margin: "0 0 8px", lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{feature.description}</p>}
          {(feature.owner || feature.theme || (feature.status && feature.status !== "backlog") || signalCount > 0 || updatedAt) && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
              {feature.owner && <span style={{ fontSize: 9, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.border, borderRadius: 4 }}>{feature.owner}</span>}
              {feature.theme && <span style={{ fontSize: 9, color: C.purple, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.purpleDim, borderRadius: 4 }}>{feature.theme}</span>}
              {feature.status && feature.status !== "backlog" && <Pill color={getStatusColor(feature.status)} dimColor={getStatusColor(feature.status) + "20"} small>{feature.status.toUpperCase()}</Pill>}
              {signalCount > 0 && <span style={{ fontSize: 9, color: C.blue, fontFamily: "'JetBrains Mono', monospace", padding: "1px 6px", background: C.blueDim, borderRadius: 4 }}>{signalCount} signal{signalCount !== 1 ? "s" : ""}</span>}
              {updatedAt && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>{relativeTime(updatedAt)}</span>}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <ScoreBar value={feature.reach} color={C.accent} label="R" />
            <ScoreBar value={feature.impact} color={C.blue} label="I" />
            <ScoreBar value={feature.confidence} color={C.purple} label="C" />
            <ScoreBar value={feature.effort} color={C.warn} label="E" />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <Pill color={tier.color} dimColor={tier.color + "20"}>{tier.label}</Pill>
          <span style={{ fontSize: 18, fontWeight: 800, color: tier.color, fontFamily: "'JetBrains Mono', monospace" }}>{score.toLocaleString()}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <button aria-label={`Edit ${feature.name}`} onClick={e => { e.stopPropagation(); onEdit(feature); }} style={{ padding: "3px 8px", border: `1px solid color-mix(in srgb, var(--accent) 13%, transparent)`, borderRadius: 6, background: "transparent", color: "color-mix(in srgb, var(--accent) 50%, transparent)", fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}
              onMouseEnter={e => { e.target.style.background = C.blueDim; e.target.style.color = C.blue; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "color-mix(in srgb, var(--accent) 50%, transparent)"; }}>✎ Edit</button>
            <button aria-label={`Remove ${feature.name}`} onClick={e => { e.stopPropagation(); onDelete(feature.id); }} style={{ padding: "3px 8px", border: `1px solid color-mix(in srgb, var(--danger) 13%, transparent)`, borderRadius: 6, background: "transparent", color: "color-mix(in srgb, var(--danger) 50%, transparent)", fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}
              onMouseEnter={e => { e.target.style.background = C.dangerDim; e.target.style.color = C.danger; }}
              onMouseLeave={e => { e.target.style.background = "transparent"; e.target.style.color = "color-mix(in srgb, var(--danger) 50%, transparent)"; }}>✕ Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
};
