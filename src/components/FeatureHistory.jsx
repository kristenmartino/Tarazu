import { useState, useEffect, useRef } from "react";
import { useC } from "../ThemeProvider";
import { Pill } from "./Pill";
import * as cloud from "../../lib/cloud-storage";

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const FieldDiff = ({ change }) => {
  const C = useC();
  const SCORE_COLORS = { reach: C.reach, impact: C.impact, confidence: C.confidence, effort: C.danger };
  const { field, old: oldVal, new: newVal } = change;
  const isScore = ["reach", "impact", "confidence", "effort"].includes(field);
  const color = SCORE_COLORS[field] || C.textMuted;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 0", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
      <span style={{ color, width: 80, fontWeight: 600 }}>{field.toUpperCase()}</span>
      {isScore ? (
        <>
          <span style={{ color: "color-mix(in srgb, var(--danger) 56%, transparent)" }}>{oldVal}</span>
          <span style={{ color: C.textDim }}>{"\u2192"}</span>
          <span style={{ color: "color-mix(in srgb, var(--success) 56%, transparent)" }}>{newVal}</span>
          <span style={{ color: newVal > oldVal ? C.accent : C.danger, fontSize: 9 }}>
            ({newVal > oldVal ? "+" : ""}{newVal - oldVal})
          </span>
        </>
      ) : (
        <>
          <span style={{ color: "color-mix(in srgb, var(--danger) 38%, transparent)", textDecoration: "line-through", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(oldVal)}>
            {oldVal || "(empty)"}
          </span>
          <span style={{ color: C.textDim }}>{"\u2192"}</span>
          <span style={{ color: "color-mix(in srgb, var(--success) 56%, transparent)", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={String(newVal)}>
            {newVal || "(empty)"}
          </span>
        </>
      )}
    </div>
  );
};

const RevisionRow = ({ revision, isExpanded, onToggle, onRevert, isReverting, isLatest }) => {
  const C = useC();
  const TYPE_CONFIG = {
    created: { color: C.accent, label: "CREATED" },
    updated: { color: C.blue, label: "UPDATED" },
    reverted: { color: C.purple, label: "REVERTED" },
  };
  const SCORE_COLORS = { reach: C.reach, impact: C.impact, confidence: C.confidence, effort: C.danger };
  const tc = TYPE_CONFIG[revision.change_type] || TYPE_CONFIG.updated;
  const scoreChanges = (revision.changed_fields || []).filter(
    cf => ["reach", "impact", "confidence", "effort"].includes(cf.field)
  );

  return (
    <div style={{ borderBottom: `1px solid ${C.border}` }}>
      <div
        onClick={onToggle}
        style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", transition: "background 0.15s" }}
        onMouseEnter={e => e.currentTarget.style.background = C.bg}
        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
      >
        <span style={{ fontSize: 10, fontWeight: 800, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", width: 28, flexShrink: 0 }}>
          #{revision.revision_number}
        </span>
        <Pill color={tc.color} dimColor={tc.color + "20"} small>{tc.label}</Pill>
        {scoreChanges.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexShrink: 0 }}>
            {scoreChanges.map(sc => (
              <span key={sc.field} style={{ fontSize: 9, color: SCORE_COLORS[sc.field], fontFamily: "'JetBrains Mono', monospace" }}
                title={`${sc.field}: ${sc.old} \u2192 ${sc.new}`}>
                {sc.field.charAt(0).toUpperCase()}{sc.new > sc.old ? "+" : "-"}
              </span>
            ))}
          </div>
        )}
        <span style={{ flex: 1, fontSize: 10, color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {revision.change_summary}
        </span>
        <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
          {formatRelativeTime(revision.created_at)}
        </span>
        <span style={{ fontSize: 8, color: C.textDim, transform: isExpanded ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.15s", flexShrink: 0 }}>
          {"\u25BC"}
        </span>
      </div>

      {isExpanded && (
        <div style={{ padding: "0 14px 12px", background: C.bg }}>
          {(revision.changed_fields || []).map(cf => (
            <FieldDiff key={cf.field} change={cf} />
          ))}
          {revision.changed_fields?.length === 0 && revision.change_type === "created" && (
            <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>Initial version</span>
          )}
          {revision.reverted_to_revision && (
            <span style={{ display: "block", marginTop: 6, fontSize: 9, color: C.purple, fontFamily: "'JetBrains Mono', monospace" }}>
              Restored state from revision #{revision.reverted_to_revision}
            </span>
          )}
          {!isLatest && (
            <button
              onClick={e => { e.stopPropagation(); onRevert(); }}
              disabled={isReverting}
              style={{
                marginTop: 8, padding: "5px 12px", border: `1px solid ${C.purple}30`, borderRadius: 6,
                background: C.purpleDim, color: C.purple, fontSize: 10, fontWeight: 600,
                cursor: isReverting ? "not-allowed" : "pointer", fontFamily: "'JetBrains Mono', monospace",
                opacity: isReverting ? 0.5 : 1, transition: "all 0.2s",
              }}
            >
              {isReverting ? "Reverting..." : `\u21A9 Revert to #${revision.revision_number}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export const FeatureHistory = ({ wsId, featureId, feature, onRevert }) => {
  const C = useC();
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedRev, setExpandedRev] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [reverting, setReverting] = useState(null);
  const refreshTimer = useRef(null);
  const isInitialLoad = useRef(true);

  const fetchHistory = (showLoader) => {
    if (showLoader) setLoading(true);
    return cloud.fetchFeatureHistory(wsId, featureId, 1, 20).then(data => {
      setRevisions(data.revisions);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(1);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  // Initial load
  useEffect(() => {
    isInitialLoad.current = true;
    setRevisions([]);
    setExpandedRev(null);
    fetchHistory(true).then(() => { isInitialLoad.current = false; });
  }, [wsId, featureId]);

  // Re-fetch after feature changes (delayed to wait for auto-save + server)
  const featureKey = feature ? `${feature.name}-${feature.description}-${feature.reach}-${feature.impact}-${feature.confidence}-${feature.effort}` : "";
  useEffect(() => {
    if (isInitialLoad.current) return;
    clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => fetchHistory(false), 2000);
    return () => clearTimeout(refreshTimer.current);
  }, [featureKey]);

  const loadMore = async () => {
    const nextPage = page + 1;
    try {
      const data = await cloud.fetchFeatureHistory(wsId, featureId, nextPage, 20);
      setRevisions(prev => [...prev, ...data.revisions]);
      setPage(nextPage);
      setHasMore(data.hasMore);
    } catch {}
  };

  const handleRevert = async (revisionNumber) => {
    setReverting(revisionNumber);
    try {
      const result = await cloud.revertFeature(wsId, featureId, revisionNumber);
      // Refresh history
      const data = await cloud.fetchFeatureHistory(wsId, featureId, 1, 20);
      setRevisions(data.revisions);
      setHasMore(data.hasMore);
      setTotal(data.total);
      setPage(1);
      setExpandedRev(null);
      if (onRevert) onRevert(result);
    } catch (err) {
      console.error("Revert failed:", err);
    }
    setReverting(null);
  };

  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>
          DECISION HISTORY
        </span>
        {total > 0 && <Pill color={C.purple} dimColor={C.purpleDim} small>{total}</Pill>}
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>Loading history...</span>
        </div>
      ) : revisions.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          <span style={{ fontSize: 11, color: C.textMuted }}>No revision history yet</span>
        </div>
      ) : (
        <div style={{ maxHeight: 300, overflowY: "auto" }}>
          {revisions.map(rev => (
            <RevisionRow
              key={rev.id}
              revision={rev}
              isExpanded={expandedRev === rev.revision_number}
              onToggle={() => setExpandedRev(expandedRev === rev.revision_number ? null : rev.revision_number)}
              onRevert={() => handleRevert(rev.revision_number)}
              isReverting={reverting === rev.revision_number}
              isLatest={rev.revision_number === revisions[0]?.revision_number}
            />
          ))}
          {hasMore && (
            <button onClick={loadMore} style={{
              width: "100%", padding: 8, border: "none", background: "transparent",
              color: C.accent, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>
              Load older revisions...
            </button>
          )}
        </div>
      )}
    </div>
  );
};
