import { useState } from "react";
import { useC, useTheme } from "../ThemeProvider";
import { Pill } from "./Pill";

export const SettingsScreen = ({
  activeWs, onRenameWorkspace, onClear, onDeleteWorkspace,
  viewMode, onViewModeChange, sortMode, onSortModeChange,
  mapColorBy, mapSizeBy, mapLabelMode,
  onMapColorByChange, onMapSizeByChange, onMapLabelModeChange,
  isSignedIn, features,
}) => {
  const C = useC();
  const { themeName, setThemeName, themes } = useTheme();
  const sectionStyle = { padding: 20, border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface };
  const labelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace", marginBottom: 6 };
  const selectStyle = { padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer", width: "100%" };
  const inputStyle = { ...selectStyle, cursor: "text" };
  const [wsName, setWsName] = useState(activeWs?.name || "");
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRename = () => {
    if (wsName.trim() && wsName.trim() !== activeWs?.name) {
      onRenameWorkspace(activeWs?.id, wsName.trim());
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", padding: "0 24px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Settings</h2>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Appearance */}
        <div style={sectionStyle}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, display: "block", marginBottom: 16 }}>Appearance</span>
          <div>
            <div style={labelStyle}>THEME</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {themes.map(({ id, label }) => {
                const active = themeName === id;
                return (
                  <button
                    key={id}
                    onClick={() => setThemeName(id)}
                    aria-pressed={active}
                    style={{
                      padding: "8px 14px",
                      border: `1px solid ${active ? C.accent : C.border}`,
                      borderRadius: 8,
                      background: active ? C.accentSubtle : "transparent",
                      color: active ? C.accent : C.textMuted,
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'JetBrains Mono', monospace",
                      transition: "all 0.2s",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workspace */}
        <div style={sectionStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text }}>Workspace</span>
            <Pill color={C.blue} dimColor={C.blueDim} small>{activeWs?.name || "Default"}</Pill>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={labelStyle}>WORKSPACE NAME</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input value={wsName} onChange={e => setWsName(e.target.value)} onBlur={handleRename} onKeyDown={e => e.key === "Enter" && handleRename()} style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleRename} style={{ padding: "8px 14px", border: `1px solid color-mix(in srgb, var(--accent) 19%, transparent)`, borderRadius: 8, background: C.blueDim, color: C.blue, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>Rename</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div style={labelStyle}>DEFAULT SORT</div>
                <select value={sortMode} onChange={e => onSortModeChange(e.target.value)} style={selectStyle}>
                  <option value="rice">Framework Rank (RICE)</option>
                  <option value="manual">Judgment Override</option>
                </select>
              </div>
              <div>
                <div style={labelStyle}>DEFAULT VIEW</div>
                <select value={viewMode} onChange={e => onViewModeChange(e.target.value)} style={selectStyle}>
                  <option value="list">List</option>
                  <option value="map">Map</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Display */}
        <div style={sectionStyle}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, display: "block", marginBottom: 16 }}>Map Display Defaults</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>COLOR BY</div>
              <select value={mapColorBy} onChange={e => onMapColorByChange(e.target.value)} style={selectStyle}>
                <option value="tier">Tier</option>
                <option value="confidence">Confidence</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>SIZE BY</div>
              <select value={mapSizeBy} onChange={e => onMapSizeByChange(e.target.value)} style={selectStyle}>
                <option value="uniform">Uniform</option>
                <option value="reach">Reach</option>
                <option value="score">Score</option>
              </select>
            </div>
            <div>
              <div style={labelStyle}>LABELS</div>
              <select value={mapLabelMode} onChange={e => onMapLabelModeChange(e.target.value)} style={selectStyle}>
                <option value="hover">Hover</option>
                <option value="always">Always</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
        </div>

        {/* About */}
        <div style={sectionStyle}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.text, display: "block", marginBottom: 16 }}>About</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Application", value: "Tarazu" },
              { label: "Framework", value: "RICE" },
              { label: "Candidates", value: features.length },
              { label: "Storage", value: isSignedIn ? "Cloud (Supabase)" : "Local (Browser)" },
            ].map(r => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 10, color: C.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{r.label}</span>
                <span style={{ fontSize: 11, color: C.text, fontFamily: "'JetBrains Mono', monospace" }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div style={{ ...sectionStyle, borderColor: "color-mix(in srgb, var(--danger) 19%, transparent)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.danger, display: "block", marginBottom: 16 }}>Danger Zone</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Clear all candidates</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Remove all candidates from this workspace</div>
              </div>
              {confirmClear ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { onClear(); setConfirmClear(false); }} style={{ padding: "6px 12px", border: `1px solid ${C.danger}`, borderRadius: 6, background: C.danger, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Confirm</button>
                  <button onClick={() => setConfirmClear(false)} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmClear(true)} style={{ padding: "6px 12px", border: `1px solid color-mix(in srgb, var(--danger) 19%, transparent)`, borderRadius: 6, background: C.dangerDim, color: C.danger, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Clear</button>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderTop: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: C.text }}>Delete workspace</div>
                <div style={{ fontSize: 10, color: C.textDim, marginTop: 2 }}>Permanently delete this workspace and all data</div>
              </div>
              {confirmDelete ? (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { onDeleteWorkspace(); setConfirmDelete(false); }} style={{ padding: "6px 12px", border: `1px solid ${C.danger}`, borderRadius: 6, background: C.danger, color: "#fff", fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Confirm</button>
                  <button onClick={() => setConfirmDelete(false)} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 10, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} style={{ padding: "6px 12px", border: `1px solid color-mix(in srgb, var(--danger) 19%, transparent)`, borderRadius: 6, background: C.dangerDim, color: C.danger, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Delete</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
