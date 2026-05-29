import { useState, useEffect, useCallback, useMemo } from "react";
import { C } from "../theme";
import { rice } from "../utils";
import { SCENARIO_TEMPLATES } from "../scenarios";
import { useWeightedScored, scenarioContributions } from "../hooks/useWeightedScored";
import { Pill } from "./Pill";
import * as cloud from "../../lib/cloud-storage";
import { saveWsScenarios, loadWsScenarios } from "../../lib/local-storage";

const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" };
const DIMS = ["reach", "impact", "confidence", "effort"];
const DIM_COLORS = { reach: C.accent, impact: C.blue, confidence: C.purple, effort: C.warn };

export const ScenariosScreen = ({ features, scored, sorted, activeWsId, isSignedIn, onSelect, isMobile }) => {
  const [activeKey, setActiveKey] = useState("default");
  const [weights, setWeights] = useState({ reach: 1.0, impact: 1.0, confidence: 1.0, effort: 1.0 });
  const [customScenarios, setCustomScenarios] = useState([]);
  const [isCustom, setIsCustom] = useState(false);

  // Load custom scenarios on mount
  useEffect(() => {
    if (!activeWsId) return;
    if (isSignedIn) {
      cloud.fetchScenarios(activeWsId).then(r => setCustomScenarios(r.scenarios || [])).catch(() => {});
    } else {
      setCustomScenarios(loadWsScenarios(activeWsId));
    }
  }, [activeWsId, isSignedIn]);

  const selectTemplate = useCallback((tpl) => {
    setActiveKey(tpl.key);
    setWeights(tpl.weights);
    setIsCustom(false);
  }, []);

  const selectCustom = useCallback((scenario) => {
    setActiveKey(scenario.id);
    setWeights({ reach: Number(scenario.weight_reach), impact: Number(scenario.weight_impact), confidence: Number(scenario.weight_confidence), effort: Number(scenario.weight_effort) });
    setIsCustom(false);
  }, []);

  const enterCustomMode = useCallback(() => {
    setActiveKey("custom");
    setIsCustom(true);
  }, []);

  const saveCustomScenario = useCallback(async () => {
    const name = prompt("Scenario name:");
    if (!name?.trim()) return;
    const scenario = { name: name.trim(), description: "Custom weights", weight_reach: weights.reach, weight_impact: weights.impact, weight_confidence: weights.confidence, weight_effort: weights.effort };
    if (isSignedIn && activeWsId) {
      try {
        const result = await cloud.createScenario(activeWsId, scenario);
        setCustomScenarios(prev => [...prev, result]);
      } catch (err) { console.error(err); }
    } else {
      const local = { ...scenario, id: `scn-${Date.now()}`, created_at: new Date().toISOString() };
      setCustomScenarios(prev => { const updated = [...prev, local]; saveWsScenarios(activeWsId, updated); return updated; });
    }
  }, [weights, isSignedIn, activeWsId]);

  const deleteCustomScenario = useCallback(async (id) => {
    if (isSignedIn && activeWsId) {
      try { await cloud.deleteScenarioApi(activeWsId, id); } catch (err) { console.error(err); return; }
    }
    setCustomScenarios(prev => {
      const updated = prev.filter(s => s.id !== id);
      if (!isSignedIn) saveWsScenarios(activeWsId, updated);
      return updated;
    });
    if (activeKey === id) selectTemplate(SCENARIO_TEMPLATES[0]);
  }, [isSignedIn, activeWsId, activeKey, selectTemplate]);

  const { sorted: weightedSorted } = useWeightedScored(features, weights);

  // Compute default rankings for comparison
  const defaultRanked = useMemo(() => sorted.map((f, i) => ({ ...f, defaultRank: i + 1 })), [sorted]);
  const defaultRankMap = useMemo(() => {
    const map = {};
    defaultRanked.forEach((f, i) => { map[f.id] = i + 1; });
    return map;
  }, [defaultRanked]);

  // Compute movements
  const movements = useMemo(() => {
    return weightedSorted.map((f, i) => {
      const scenarioRank = i + 1;
      const defaultRank = defaultRankMap[f.id] || scenarioRank;
      const movement = defaultRank - scenarioRank;
      return { ...f, scenarioRank, defaultRank, movement };
    });
  }, [weightedSorted, defaultRankMap]);

  const bigMovers = useMemo(() =>
    [...movements].filter(m => Math.abs(m.movement) >= 2).sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement)).slice(0, 5),
  [movements]);

  const activeLabel = isCustom ? "Custom Weights"
    : SCENARIO_TEMPLATES.find(t => t.key === activeKey)?.name
    || customScenarios.find(s => s.id === activeKey)?.name
    || "Standard RICE";

  return (
    <div style={{ padding: "0 24px 24px" }}>
      <div style={{ padding: "16px 0" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: "0 0 4px" }}>Scenarios</h2>
        <p style={{ fontSize: 12, color: C.textDim, margin: 0 }}>Explore alternate ranking logic before you commit.</p>
      </div>

      <div style={{ display: isMobile ? "flex" : "grid", flexDirection: isMobile ? "column" : undefined, gridTemplateColumns: isMobile ? undefined : "220px 1fr 280px", gap: 16 }}>
        {/* Left: Presets */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={labelStyle}>PRESETS</div>
          {SCENARIO_TEMPLATES.map(tpl => (
            <button key={tpl.key} onClick={() => selectTemplate(tpl)} style={{
              padding: 12, border: `1px solid ${activeKey === tpl.key && !isCustom ? C.accent : C.border}`, borderRadius: 8,
              background: activeKey === tpl.key && !isCustom ? C.accent + "10" : C.surface, textAlign: "left", cursor: "pointer",
              ...(activeKey === tpl.key && !isCustom ? { borderLeftWidth: 3, borderLeftColor: C.accent } : {}),
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: activeKey === tpl.key && !isCustom ? C.accent : C.text, marginBottom: 4 }}>{tpl.name}</div>
              <div style={{ fontSize: 10, color: C.textDim, lineHeight: 1.4 }}>{tpl.description}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                {DIMS.map(d => (
                  <div key={d} style={{ flex: 1 }}>
                    <div style={{ height: 4, borderRadius: 2, background: C.border }}>
                      <div style={{ height: 4, borderRadius: 2, background: DIM_COLORS[d], width: `${Math.min(tpl.weights[d] / 3 * 100, 100)}%` }} />
                    </div>
                    <div style={{ fontSize: 8, color: C.textDim, textAlign: "center", marginTop: 2 }}>{d.charAt(0).toUpperCase()}</div>
                  </div>
                ))}
              </div>
            </button>
          ))}

          {customScenarios.length > 0 && (
            <>
              <div style={{ ...labelStyle, marginTop: 8 }}>SAVED</div>
              {customScenarios.map(s => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={() => selectCustom(s)} style={{
                    flex: 1, padding: 10, border: `1px solid ${activeKey === s.id ? C.blue : C.border}`, borderRadius: 8,
                    background: activeKey === s.id ? C.blue + "10" : C.surface, textAlign: "left", cursor: "pointer",
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: activeKey === s.id ? C.blue : C.text }}>{s.name}</div>
                  </button>
                  <button onClick={() => deleteCustomScenario(s.id)} style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, padding: 4 }}>&#10005;</button>
                </div>
              ))}
            </>
          )}

          <button onClick={enterCustomMode} style={{
            padding: 10, border: `1px dashed ${isCustom ? C.purple : C.border}`, borderRadius: 8,
            background: isCustom ? C.purple + "10" : "transparent", textAlign: "left", cursor: "pointer", marginTop: 4,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: isCustom ? C.purple : C.textMuted }}>Custom Weights</div>
          </button>

          {isCustom && (
            <div style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface }}>
              {DIMS.map(d => (
                <div key={d} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: DIM_COLORS[d], fontFamily: "'JetBrains Mono', monospace" }}>{d.toUpperCase()}</span>
                    <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{weights[d].toFixed(1)}x</span>
                  </div>
                  <input type="range" min="0.1" max="5.0" step="0.1" value={weights[d]}
                    onChange={e => setWeights(w => ({ ...w, [d]: parseFloat(e.target.value) }))}
                    style={{ width: "100%", accentColor: DIM_COLORS[d] }} />
                </div>
              ))}
              <button onClick={saveCustomScenario} style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.purple}30`, borderRadius: 6, background: C.purple + "10", color: C.purple, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Save Scenario</button>
            </div>
          )}
        </div>

        {/* Center: Ranking comparison */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div style={labelStyle}>RANKING COMPARISON</div>
            <Pill color={C.textMuted} dimColor={C.border}>{activeLabel}</Pill>
          </div>

          {features.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>
              <div style={{ fontSize: 12 }}>Add candidates to see ranking comparisons.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 40px 1fr", gap: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 600, color: C.textDim, padding: "0 0 8px", fontFamily: "'JetBrains Mono', monospace" }}>DEFAULT RICE</div>
              <div />
              <div style={{ fontSize: 9, fontWeight: 600, color: C.textDim, padding: "0 0 8px", fontFamily: "'JetBrains Mono', monospace" }}>SCENARIO</div>
              {movements.map((m, i) => {
                const defaultFeature = defaultRanked[i];
                const moveColor = m.movement > 0 ? C.accent : m.movement < 0 ? C.danger : C.textDim;
                return [
                  <div key={`d-${i}`} style={{ padding: "6px 8px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", width: 20, textAlign: "right" }}>#{i + 1}</span>
                    <span style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{defaultFeature?.name}</span>
                  </div>,
                  <div key={`m-${i}`} style={{ padding: "6px 0", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {m.movement !== 0 && (
                      <span style={{ fontSize: 11, fontWeight: 700, color: moveColor }}>
                        {m.movement > 0 ? `\u2191${m.movement}` : `\u2193${Math.abs(m.movement)}`}
                      </span>
                    )}
                    {m.movement === 0 && <span style={{ fontSize: 10, color: C.textDim }}>=</span>}
                  </div>,
                  <div key={`s-${i}`} onClick={() => onSelect(m.id)} style={{
                    padding: "6px 8px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 6, cursor: "pointer",
                    background: Math.abs(m.movement) >= 2 ? moveColor + "08" : "transparent",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: moveColor, fontFamily: "'JetBrains Mono', monospace", width: 20, textAlign: "right" }}>#{m.scenarioRank}</span>
                    <span style={{ fontSize: 11, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</span>
                    <span title="Normalized 0–100 index relative to the top-ranked candidate" style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto" }}>{m.scenarioIndex}</span>
                  </div>,
                ];
              })}
            </div>
          )}
        </div>

        {/* Right: Movement explainer */}
        <div>
          <div style={labelStyle}>WEIGHT DISTRIBUTION</div>
          <div style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 8, background: C.surface, marginTop: 8, marginBottom: 16 }}>
            {DIMS.map(d => (
              <div key={d} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: DIM_COLORS[d], fontFamily: "'JetBrains Mono', monospace", width: 20 }}>{d.charAt(0).toUpperCase()}</span>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: C.border }}>
                  <div style={{ height: 8, borderRadius: 4, background: DIM_COLORS[d], width: `${Math.min(weights[d] / 5 * 100, 100)}%`, transition: "width 0.2s" }} />
                </div>
                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace", width: 30, textAlign: "right" }}>{weights[d].toFixed(1)}x</span>
              </div>
            ))}
          </div>

          {bigMovers.length > 0 && (
            <>
              <div style={{ ...labelStyle, marginBottom: 8 }}>BIGGEST MOVERS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bigMovers.map(m => {
                  const moveColor = m.movement > 0 ? C.accent : C.danger;
                  const direction = m.movement > 0 ? "up" : "down";
                  // Identifies the dimension contributing most to THIS candidate's
                  // weighted score under the current weighting vs standard RICE.
                  // This is a score-contribution/sensitivity signal, not proof of
                  // why the candidate's rank moved relative to others (rank
                  // movement is comparative across the whole list).
                  const driver = scenarioContributions(m, weights)[0];
                  const driverWeight = weights[driver.dim];

                  return (
                    <div key={m.id} style={{ padding: 10, border: `1px solid ${moveColor}20`, borderRadius: 8, background: moveColor + "08" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: moveColor }}>{m.movement > 0 ? "\u2191" : "\u2193"}{Math.abs(m.movement)}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.text }}>{m.name}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.5 }}>
                        Moved {direction} from #{m.defaultRank} to #{m.scenarioRank}. Largest score contribution under this weighting:{" "}
                        <span style={{ color: DIM_COLORS[driver.dim] }}>{driver.dim}</span> ({driverWeight.toFixed(1)}\u00d7, {m[driver.dim]}/100).
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {bigMovers.length === 0 && features.length > 0 && (
            <div style={{ padding: 20, textAlign: "center", color: C.textDim, fontSize: 11 }}>
              No significant rank changes with this scenario.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
