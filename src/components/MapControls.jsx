import { useC } from "../ThemeProvider";

const PRESETS = [
  { label: "All", colorBy: "tier", sizeBy: "uniform", labelMode: "hover", owner: "all", theme: "all" },
  { label: "High Confidence", colorBy: "confidence", sizeBy: "score", labelMode: "always", owner: "all", theme: "all" },
  { label: "By Reach", colorBy: "tier", sizeBy: "reach", labelMode: "always", owner: "all", theme: "all" },
];

const isPresetActive = (preset, props) =>
  preset.colorBy === props.colorBy && preset.sizeBy === props.sizeBy &&
  preset.labelMode === props.labelMode && preset.owner === props.filterOwner &&
  preset.theme === props.filterTheme;

export const MapControls = ({ colorBy, sizeBy, labelMode, onColorByChange, onSizeByChange, onLabelModeChange, filterOwner, filterTheme, owners, themes, onFilterOwnerChange, onFilterThemeChange, onApplyPreset }) => {
  const C = useC();
  const selectStyle = {
    padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6,
    background: C.bg, color: C.text, fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
    outline: "none", cursor: "pointer",
  };
  return (
  <div data-no-print style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
    {onApplyPreset && (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>PRESETS</span>
        {PRESETS.map(p => {
          const active = isPresetActive(p, { colorBy, sizeBy, labelMode, filterOwner, filterTheme });
          return (
            <button key={p.label} onClick={() => onApplyPreset(p)} style={{
              padding: "3px 10px", border: `1px solid ${active ? C.accent : C.border}`, borderRadius: 12,
              background: active ? C.accentGlow : "transparent",
              color: active ? C.accent : C.textMuted,
              fontSize: 9, fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", transition: "all 0.15s",
            }}>{p.label}</button>
          );
        })}
      </div>
    )}
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>COLOR</label>
        <select value={colorBy} onChange={e => onColorByChange(e.target.value)} style={selectStyle}>
          <option value="tier">Tier</option>
          <option value="confidence">Confidence</option>
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>SIZE</label>
        <select value={sizeBy} onChange={e => onSizeByChange(e.target.value)} style={selectStyle}>
          <option value="uniform">Uniform</option>
          <option value="reach">Reach</option>
          <option value="score">Score</option>
        </select>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>LABELS</label>
        <select value={labelMode} onChange={e => onLabelModeChange(e.target.value)} style={selectStyle}>
          <option value="hover">Hover</option>
          <option value="always">Always</option>
          <option value="off">Off</option>
        </select>
      </div>
      {owners && owners.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>OWNER</label>
          <select value={filterOwner} onChange={e => onFilterOwnerChange(e.target.value)} style={selectStyle}>
            <option value="all">All</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      )}
      {themes && themes.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <label style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>THEME</label>
          <select value={filterTheme} onChange={e => onFilterThemeChange(e.target.value)} style={selectStyle}>
            <option value="all">All</option>
            {themes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}
    </div>
  </div>
  );
};
