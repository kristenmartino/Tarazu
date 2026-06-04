import { useState, useMemo, useRef } from "react";
import { SAMPLES } from "../theme";
import { useC } from "../ThemeProvider";
import { exportCSV } from "../utils";
import { Pill } from "./Pill";
import { Form } from "./Form";
import { Card } from "./Card";
import { ImportPanel } from "./ImportPanel";
import { Matrix } from "./Matrix";
import { MapControls } from "./MapControls";
import { PlaceholderScreen } from "./PlaceholderScreen";
import { FeatureHistory } from "./FeatureHistory";
import { DecisionsScreen } from "./DecisionsScreen";
import { SignalsScreen } from "./SignalsScreen";
import { ScenariosScreen } from "./ScenariosScreen";
import { WorkspaceHome } from "./WorkspaceHome";
import { SettingsScreen } from "./SettingsScreen";
import { OnboardingPanel } from "./OnboardingPanel";
import { ValidateScreen } from "./ValidateScreen";

const PLACEHOLDER_SCREENS = {};

export const CenterCanvas = ({
  activeScreen, viewMode, onViewModeChange,
  features, scored, sorted, displayOrder, maxScore,
  selectedId, onSelect,
  showForm, onShowForm, editingFeature, onEditingFeature,
  onAddFeature, onDeleteFeature, onEditFeature,
  sortMode, onSortModeChange,
  manualOrder, onManualOrderChange,
  onDragStart, onDragOver, onDrop, dragId, onMove,
  undoSnapshot, onUndo, onLoadSamples, onClear,
  importData, onConfirmImport, onCancelImport,
  onImportFile, onExportCSV,
  productContext, onScoreEvent, onResolveScores, feedbackContext,
  isMobile,
  mapColorBy, mapSizeBy, mapLabelMode,
  onMapColorByChange, onMapSizeByChange, onMapLabelModeChange,
  // Mobile workspace switcher props
  activeWs, workspaces, onSwitchWorkspace, onAddWorkspace, onDeleteWorkspace, onRenameWorkspace,
  isSignedIn, activeWsId,
  // Decisions & Signals
  decisions, signals,
  onAddDecision, onUpdateDecision, onDeleteDecision,
  onAddSignal, onUpdateSignal, onDeleteSignal, onImportSignals,
  onScreenChange,
  searchRef: externalSearchRef,
}) => {
  const C = useC();
  // Signal counts per candidate
  const signalCounts = useMemo(() => {
    const counts = {};
    for (const s of signals) {
      const cid = s.linked_candidate_id;
      if (cid) counts[cid] = (counts[cid] || 0) + 1;
    }
    return counts;
  }, [signals]);

  // Map filter state
  const [mapFilterOwner, setMapFilterOwner] = useState("all");
  const [mapFilterTheme, setMapFilterTheme] = useState("all");
  const uniqueOwners = useMemo(() => [...new Set(scored.map(f => f.owner).filter(Boolean))].sort(), [scored]);
  const uniqueThemes = useMemo(() => [...new Set(scored.map(f => f.theme).filter(Boolean))].sort(), [scored]);
  const filteredScored = useMemo(() => scored.filter(f =>
    (mapFilterOwner === "all" || f.owner === mapFilterOwner) &&
    (mapFilterTheme === "all" || f.theme === mapFilterTheme)
  ), [scored, mapFilterOwner, mapFilterTheme]);

  // List filter state
  const [listFilterOwner, setListFilterOwner] = useState("all");
  const [listFilterTheme, setListFilterTheme] = useState("all");
  const [listFilterStatus, setListFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const localSearchRef = useRef(null);
  const searchInputRef = externalSearchRef || localSearchRef;
  const uniqueStatuses = useMemo(() => [...new Set(scored.map(f => f.status).filter(Boolean))].sort(), [scored]);
  const filteredDisplayOrder = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return displayOrder.filter(f =>
      (listFilterOwner === "all" || f.owner === listFilterOwner) &&
      (listFilterTheme === "all" || f.theme === listFilterTheme) &&
      (listFilterStatus === "all" || f.status === listFilterStatus) &&
      (!q || f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q)))
    );
  }, [displayOrder, listFilterOwner, listFilterTheme, listFilterStatus, searchQuery]);
  const listFiltersActive = listFilterOwner !== "all" || listFilterTheme !== "all" || listFilterStatus !== "all" || searchQuery !== "";

  // Map preset handler
  const handleMapPreset = (preset) => {
    onMapColorByChange(preset.colorBy);
    onMapSizeByChange(preset.sizeBy);
    onMapLabelModeChange(preset.labelMode);
    setMapFilterOwner(preset.owner);
    setMapFilterTheme(preset.theme);
  };

  // Non-priorities screens
  if (activeScreen === "home") return <WorkspaceHome scored={scored} decisions={decisions} signals={signals} activeWs={activeWs} onScreenChange={onScreenChange} />;
  if (activeScreen === "decisions") return <DecisionsScreen decisions={decisions} scored={scored} onAdd={onAddDecision} onUpdate={onUpdateDecision} onDelete={onDeleteDecision} />;
  if (activeScreen === "signals") return <SignalsScreen signals={signals} scored={scored} onAdd={onAddSignal} onUpdate={onUpdateSignal} onDelete={onDeleteSignal} onImport={onImportSignals} />;
  if (activeScreen === "validate") return <ValidateScreen scored={scored} signals={signals} productContext={productContext} onAddDecision={onAddDecision} onScreenChange={onScreenChange} />;
  if (activeScreen === "scenarios") return <ScenariosScreen features={features} scored={scored} sorted={sorted} activeWsId={activeWsId} isSignedIn={isSignedIn} onSelect={onSelect} isMobile={isMobile} />;
  if (activeScreen === "settings") return <SettingsScreen activeWs={activeWs} onRenameWorkspace={onRenameWorkspace} onClear={onClear} onDeleteWorkspace={() => onDeleteWorkspace(activeWs?.id)} viewMode={viewMode} onViewModeChange={onViewModeChange} sortMode={sortMode} onSortModeChange={onSortModeChange} mapColorBy={mapColorBy} mapSizeBy={mapSizeBy} mapLabelMode={mapLabelMode} onMapColorByChange={onMapColorByChange} onMapSizeByChange={onMapSizeByChange} onMapLabelModeChange={onMapLabelModeChange} isSignedIn={isSignedIn} features={features} />;
  if (activeScreen !== "priorities") {
    const ph = PLACEHOLDER_SCREENS[activeScreen];
    if (ph) return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{ph.title}</h2>
          <Pill color={C.textMuted} dimColor={C.border} small>COMING SOON</Pill>
        </div>
        <PlaceholderScreen title={ph.title} description={ph.description} icon={ph.icon} />
      </div>
    );
    return null;
  }

  const headerBtnStyle = { padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" };

  return (
    <div role="main" id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Header bar */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Priorities</h2>
        <Pill color={C.accent} dimColor={C.accentDim} small>{listFiltersActive ? `${filteredDisplayOrder.length}/${features.length}` : features.length} CANDIDATES</Pill>
        <Pill color={C.blue} dimColor={C.blueDim} small>RICE</Pill>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          {/* View toggle */}
          <div style={{ display: "flex", gap: 2, background: C.border, borderRadius: 6, padding: 2 }}>
            <button onClick={() => onViewModeChange("list")} aria-pressed={viewMode === "list"} style={{
              padding: "4px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600,
              background: viewMode === "list" ? C.surface : "transparent",
              color: viewMode === "list" ? C.accent : C.textMuted,
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>List</button>
            <button onClick={() => onViewModeChange("map")} aria-pressed={viewMode === "map"} style={{
              padding: "4px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600,
              background: viewMode === "map" ? C.surface : "transparent",
              color: viewMode === "map" ? C.accent : C.textMuted,
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
            }}>Map</button>
          </div>

          <button data-no-print onClick={onImportFile} style={headerBtnStyle}
            onMouseEnter={e => { e.target.style.borderColor = C.blue; e.target.style.color = C.blue; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}>↑ Import</button>
          <button data-no-print onClick={onExportCSV} style={headerBtnStyle}
            onMouseEnter={e => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}>↓ CSV</button>
          <button data-no-print onClick={() => window.print()} style={headerBtnStyle}
            onMouseEnter={e => { e.target.style.borderColor = C.purple; e.target.style.color = C.purple; }}
            onMouseLeave={e => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}>⎙ PDF</button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", maxHeight: isMobile ? "none" : "calc(100vh - 48px - 52px)", padding: 20, display: "flex", flexDirection: "column", gap: 12, paddingBottom: isMobile ? 72 : 20 }}>
        {viewMode === "list" ? (
          <>
            <div data-print-only style={{ display: "none", padding: "0 0 12px", borderBottom: "2px solid #333", marginBottom: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px", color: "#1a1a1a" }}>{activeWs?.name || "Priorities"}</h1>
              <p style={{ fontSize: 11, color: "#666", margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                {features.length} candidates — RICE framework — Exported {new Date().toLocaleDateString()}
              </p>
            </div>
            <div data-no-print style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { onEditingFeature(null); onShowForm(true); }} style={{ flex: 1, padding: "10px 16px", border: `1px dashed color-mix(in srgb, var(--success) 31%, transparent)`, borderRadius: 8, background: C.accentGlow, color: C.accent, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.2s" }}
                onMouseEnter={e => e.target.style.background = C.accentDim} onMouseLeave={e => e.target.style.background = C.accentGlow}>+ Add Candidate</button>
              <button onClick={onLoadSamples} style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} title="Load example backlog">↻ Example Backlog</button>
              <button onClick={onClear} style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.danger, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} title="Clear workspace">✕ Clear Workspace</button>
              {undoSnapshot && <button onClick={onUndo} style={{ padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 8, background: "transparent", color: C.warn, fontSize: 11, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }} title="Undo last action">↩ Undo</button>}
            </div>
            {scored.length > 0 && (
              <div data-no-print style={{ position: "relative" }}>
                <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Search candidates" placeholder="Search candidates..." style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }} />
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: "2px 6px", border: "none", background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>✕</button>}
              </div>
            )}
            {showForm && <Form key={editingFeature?.id || "new"} onAdd={onAddFeature} onCancel={() => { onShowForm(false); onEditingFeature(null); }} editFeature={editingFeature} productContext={productContext} onScoreEvent={onScoreEvent} onResolveScores={onResolveScores} feedbackContext={feedbackContext} />}
            {importData && <ImportPanel importData={importData} onConfirm={onConfirmImport} onCancel={onCancelImport} />}
            {scored.length > 1 && <div style={{ display: "flex", gap: 2, background: C.border, borderRadius: 6, padding: 2 }}>
              <button onClick={() => onSortModeChange("rice")} aria-pressed={sortMode === "rice"} style={{ flex: 1, padding: "5px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600, background: sortMode === "rice" ? C.surface : "transparent", color: sortMode === "rice" ? C.accent : C.textMuted, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Framework Rank</button>
              <button onClick={() => { if (manualOrder.length === 0) onManualOrderChange(sorted.map(f => f.id)); onSortModeChange("manual"); }} aria-pressed={sortMode === "manual"} style={{ flex: 1, padding: "5px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600, background: sortMode === "manual" ? C.surface : "transparent", color: sortMode === "manual" ? C.warn : C.textMuted, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Judgment Override</button>
            </div>}
            {scored.length > 1 && (uniqueOwners.length > 0 || uniqueThemes.length > 0 || uniqueStatuses.length > 0) && (
              <div data-no-print style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {uniqueOwners.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label htmlFor="filter-owner" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>OWNER</label>
                    <select id="filter-owner" value={listFilterOwner} onChange={e => setListFilterOwner(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer" }}>
                      <option value="all">All</option>
                      {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                )}
                {uniqueThemes.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label htmlFor="filter-theme" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>THEME</label>
                    <select id="filter-theme" value={listFilterTheme} onChange={e => setListFilterTheme(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer" }}>
                      <option value="all">All</option>
                      {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                )}
                {uniqueStatuses.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <label htmlFor="filter-status" style={{ fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>STATUS</label>
                    <select id="filter-status" value={listFilterStatus} onChange={e => setListFilterStatus(e.target.value)} style={{ padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer" }}>
                      <option value="all">All</option>
                      {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
                {listFiltersActive && (
                  <button onClick={() => { setListFilterOwner("all"); setListFilterTheme("all"); setListFilterStatus("all"); setSearchQuery(""); }} style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 9, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Clear filters</button>
                )}
              </div>
            )}
            {filteredDisplayOrder.length === 0 ? (
              listFiltersActive ? (
                <div style={{ textAlign: "center", padding: 40 }}><p style={{ fontSize: 13, color: C.textMuted }}>No candidates match the current filters</p></div>
              ) : (
                <OnboardingPanel onAddCandidate={() => { onEditingFeature(null); onShowForm(true); }} onLoadSamples={onLoadSamples} />
              )
            ) : filteredDisplayOrder.map((f, i) => (
              <div key={f.id}>
                <Card feature={f} rank={i + 1} isSelected={f.id === selectedId} onClick={() => onSelect(f.id === selectedId ? null : f.id)} onDelete={onDeleteFeature} onEdit={onEditFeature} maxScore={maxScore} draggable={sortMode === "manual" && !isMobile} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} isDragging={dragId === f.id} showMoveButtons={sortMode === "manual" && isMobile} onMove={onMove} isFirst={i === 0} isLast={i === filteredDisplayOrder.length - 1} signalCount={signalCounts[f.id] || 0} updatedAt={f.updated_at || f.created_at} />
                {f.id === selectedId && isMobile && isSignedIn && activeWsId && (
                  <FeatureHistory wsId={activeWsId} featureId={f.id} feature={f} />
                )}
              </div>
            ))}
          </>
        ) : (
          <>
            <MapControls colorBy={mapColorBy} sizeBy={mapSizeBy} labelMode={mapLabelMode} onColorByChange={onMapColorByChange} onSizeByChange={onMapSizeByChange} onLabelModeChange={onMapLabelModeChange} filterOwner={mapFilterOwner} filterTheme={mapFilterTheme} owners={uniqueOwners} themes={uniqueThemes} onFilterOwnerChange={setMapFilterOwner} onFilterThemeChange={setMapFilterTheme} onApplyPreset={handleMapPreset} />
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: "16px 12px 8px", overflow: "hidden" }}>
              {filteredScored.length > 0 ? <Matrix scored={filteredScored} maxScore={maxScore} selectedId={selectedId} onSelect={onSelect} colorBy={mapColorBy} sizeBy={mapSizeBy} labelMode={mapLabelMode} /> : <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}><p style={{ fontSize: 13, color: C.textDim }}>{scored.length > 0 ? "No candidates match the current filters" : "Add candidates to see the tradeoff map"}</p></div>}
            </div>
            <div style={{ padding: 16, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, display: "flex", flexWrap: "wrap", gap: 16, flexDirection: isMobile ? "column" : "row" }}>
              <div>
                <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>RICE FORMULA</span>
                <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>(Reach × Impact × Confidence) ÷ Effort</p>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center", marginLeft: isMobile ? 0 : "auto" }}>
                {[{ l: "QUICK WIN", c: C.accent }, { l: "STRATEGIC", c: C.blue }, { l: "FILL-IN", c: C.warn }, { l: "AVOID", c: C.danger }].map(t => (
                  <div key={t.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.c }} />
                    <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
