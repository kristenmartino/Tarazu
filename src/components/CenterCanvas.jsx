import { useState, useMemo, useRef, useCallback } from "react";
import { useC } from "../ThemeProvider";
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

// Below this content width the list + map can't sit side-by-side comfortably,
// so we fall back to the stacked (collapsible map) layout. Measured against the
// scroll area's content box, so it adapts to the right rail / breakpoints.
const SIDE_BY_SIDE_MIN_W = 740;
const MAP_EXPANDED_KEY = "tz-priorities-map-expanded";

export const CenterCanvas = ({
  activeScreen,
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

  // ── Unified filter state — one bar drives both the list and the map ──
  const [filterOwner, setFilterOwner] = useState("all");
  const [filterTheme, setFilterTheme] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const localSearchRef = useRef(null);
  const searchInputRef = externalSearchRef || localSearchRef;

  const uniqueOwners = useMemo(() => [...new Set(scored.map(f => f.owner).filter(Boolean))].sort(), [scored]);
  const uniqueThemes = useMemo(() => [...new Set(scored.map(f => f.theme).filter(Boolean))].sort(), [scored]);
  const uniqueStatuses = useMemo(() => [...new Set(scored.map(f => f.status).filter(Boolean))].sort(), [scored]);

  const filtersActive = filterOwner !== "all" || filterTheme !== "all" || filterStatus !== "all" || searchQuery !== "";
  const clearFilters = () => { setFilterOwner("all"); setFilterTheme("all"); setFilterStatus("all"); setSearchQuery(""); };

  const matches = useCallback((f, q) =>
    (filterOwner === "all" || f.owner === filterOwner) &&
    (filterTheme === "all" || f.theme === filterTheme) &&
    (filterStatus === "all" || f.status === filterStatus) &&
    (!q || f.name.toLowerCase().includes(q) || (f.description && f.description.toLowerCase().includes(q))),
  [filterOwner, filterTheme, filterStatus]);

  const filteredScored = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return scored.filter(f => matches(f, q));
  }, [scored, matches, searchQuery]);
  const filteredDisplayOrder = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return displayOrder.filter(f => matches(f, q));
  }, [displayOrder, matches, searchQuery]);

  // Map presets only affect the visualization now (owner/theme live in the
  // unified filter bar), so they no longer touch the shared filters.
  const handleMapPreset = (preset) => {
    onMapColorByChange(preset.colorBy);
    onMapSizeByChange(preset.sizeBy);
    onMapLabelModeChange(preset.labelMode);
  };

  // ── Responsive layout: measure the content box so the side-by-side / stacked
  // decision tracks the *actual* available width (which shrinks when the
  // detail rail is present), not just a global breakpoint. ──
  const [contentW, setContentW] = useState(() => (isMobile ? 360 : 1100));
  const roRef = useRef(null);
  const measureRef = useCallback((node) => {
    if (roRef.current) { roRef.current.disconnect(); roRef.current = null; }
    if (node) {
      setContentW(node.clientWidth - 40); // minus horizontal padding
      const ro = new ResizeObserver(entries => setContentW(entries[0].contentRect.width));
      ro.observe(node);
      roRef.current = ro;
    }
  }, []);
  const sideBySide = !isMobile && contentW >= SIDE_BY_SIDE_MIN_W;

  // ── Mobile / narrow: map is short by default with a persisted expand toggle ──
  const [mapExpanded, setMapExpanded] = useState(() => {
    try { return localStorage.getItem(MAP_EXPANDED_KEY) === "1"; } catch { return false; }
  });
  const toggleMapExpanded = () => setMapExpanded(v => {
    const nv = !v;
    try { localStorage.setItem(MAP_EXPANDED_KEY, nv ? "1" : "0"); } catch {}
    return nv;
  });

  // Non-priorities screens
  if (activeScreen === "home") return <WorkspaceHome scored={scored} decisions={decisions} signals={signals} activeWs={activeWs} onScreenChange={onScreenChange} />;
  if (activeScreen === "decisions") return <DecisionsScreen decisions={decisions} scored={scored} onAdd={onAddDecision} onUpdate={onUpdateDecision} onDelete={onDeleteDecision} />;
  if (activeScreen === "signals") return <SignalsScreen signals={signals} scored={scored} onAdd={onAddSignal} onUpdate={onUpdateSignal} onDelete={onDeleteSignal} onImport={onImportSignals} />;
  if (activeScreen === "validate") return <ValidateScreen scored={scored} signals={signals} productContext={productContext} onAddDecision={onAddDecision} onScreenChange={onScreenChange} />;
  if (activeScreen === "scenarios") return <ScenariosScreen features={features} scored={scored} sorted={sorted} activeWsId={activeWsId} isSignedIn={isSignedIn} onSelect={onSelect} isMobile={isMobile} />;
  if (activeScreen === "settings") return <SettingsScreen activeWs={activeWs} onRenameWorkspace={onRenameWorkspace} onClear={onClear} onDeleteWorkspace={() => onDeleteWorkspace(activeWs?.id)} sortMode={sortMode} onSortModeChange={onSortModeChange} mapColorBy={mapColorBy} mapSizeBy={mapSizeBy} mapLabelMode={mapLabelMode} onMapColorByChange={onMapColorByChange} onMapSizeByChange={onMapSizeByChange} onMapLabelModeChange={onMapLabelModeChange} isSignedIn={isSignedIn} features={features} />;
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
  const filterLabelStyle = { fontSize: 9, fontWeight: 600, color: C.textDim, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" };
  const filterSelectStyle = { padding: "5px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: C.bg, color: C.text, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", outline: "none", cursor: "pointer" };
  const hasCandidates = scored.length > 0;

  // ── Shared building blocks ──
  const unifiedFilters = hasCandidates && (
    <div data-no-print style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <input ref={searchInputRef} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} aria-label="Search candidates" placeholder="Search candidates..." style={{ width: "100%", padding: "8px 12px 8px 32px", border: `1px solid ${C.border}`, borderRadius: 8, background: C.surfaceSunken, color: C.text, fontSize: 11, fontFamily: "'JetBrains Mono', monospace", outline: "none", boxSizing: "border-box" }} />
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textDim} strokeWidth="2" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        {searchQuery && <button onClick={() => setSearchQuery("")} aria-label="Clear search" style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", padding: "2px 6px", border: "none", background: "transparent", color: C.textMuted, fontSize: 12, cursor: "pointer" }}>✕</button>}
      </div>
      {(uniqueOwners.length > 0 || uniqueThemes.length > 0 || uniqueStatuses.length > 0) && (
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          {uniqueOwners.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="filter-owner" style={filterLabelStyle}>OWNER</label>
              <select id="filter-owner" value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={filterSelectStyle}>
                <option value="all">All</option>
                {uniqueOwners.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )}
          {uniqueThemes.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="filter-theme" style={filterLabelStyle}>THEME</label>
              <select id="filter-theme" value={filterTheme} onChange={e => setFilterTheme(e.target.value)} style={filterSelectStyle}>
                <option value="all">All</option>
                {uniqueThemes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          )}
          {uniqueStatuses.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <label htmlFor="filter-status" style={filterLabelStyle}>STATUS</label>
              <select id="filter-status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={filterSelectStyle}>
                <option value="all">All</option>
                {uniqueStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}
          {filtersActive && (
            <button onClick={clearFilters} style={{ padding: "4px 8px", border: `1px solid ${C.border}`, borderRadius: 6, background: "transparent", color: C.textMuted, fontSize: 9, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Clear filters</button>
          )}
        </div>
      )}
    </div>
  );

  const sortToggle = scored.length > 1 && (
    <div style={{ display: "flex", gap: 2, background: C.border, borderRadius: 6, padding: 2 }}>
      <button onClick={() => onSortModeChange("rice")} aria-pressed={sortMode === "rice"} style={{ flex: 1, padding: "5px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600, background: sortMode === "rice" ? C.surface : "transparent", color: sortMode === "rice" ? C.accent : C.textMuted, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Framework Rank</button>
      <button onClick={() => { if (manualOrder.length === 0) onManualOrderChange(sorted.map(f => f.id)); onSortModeChange("manual"); }} aria-pressed={sortMode === "manual"} style={{ flex: 1, padding: "5px 10px", borderRadius: 4, border: "none", fontSize: 10, fontWeight: 600, background: sortMode === "manual" ? C.surface : "transparent", color: sortMode === "manual" ? C.warn : C.textMuted, cursor: "pointer", fontFamily: "'JetBrains Mono', monospace" }}>Judgment Override</button>
    </div>
  );

  const listCards = filteredDisplayOrder.length === 0 ? (
    filtersActive ? (
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
  ));

  const mapControlsEl = (
    <MapControls colorBy={mapColorBy} sizeBy={mapSizeBy} labelMode={mapLabelMode} onColorByChange={onMapColorByChange} onSizeByChange={onMapSizeByChange} onLabelModeChange={onMapLabelModeChange} onApplyPreset={handleMapPreset} />
  );

  const legendBlock = (
    <div style={{ padding: 14, border: `1px solid ${C.border}`, borderRadius: 10, background: C.surface, display: "flex", flexDirection: "column", gap: 12 }}>
      <div>
        <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em" }}>RICE FORMULA</span>
        <p style={{ fontSize: 12, color: C.textMuted, margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace" }}>(Reach × Impact × Confidence) ÷ Effort</p>
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        {[{ l: "QUICK WIN", c: C.accent }, { l: "STRATEGIC", c: C.blue }, { l: "FILL-IN", c: C.warn }, { l: "AVOID", c: C.danger }].map(t => (
          <div key={t.l} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.c }} />
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{t.l}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const matrixOrEmpty = (maxH) => (
    filteredScored.length > 0
      ? <Matrix scored={filteredScored} maxScore={maxScore} selectedId={selectedId} onSelect={onSelect} colorBy={mapColorBy} sizeBy={mapSizeBy} labelMode={mapLabelMode} maxH={maxH} />
      : <div style={{ height: Math.min(maxH, 280), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <p style={{ fontSize: 13, color: C.textDim, textAlign: "center", padding: "0 12px" }}>{scored.length > 0 ? "No candidates match the current filters" : "Add candidates to see the tradeoff map"}</p>
        </div>
  );

  // Sticky map column beside the list (desktop / wide). The column scales with
  // the available width — pinned to 380px it looked cramped on wide windows
  // while the flexing list grew — capped so the list always keeps the majority.
  const mapColW = Math.max(380, Math.min(680, Math.round(contentW * 0.44)));
  const sideMap = (
    <div style={{ width: mapColW, flexShrink: 0, position: "sticky", top: 0, alignSelf: "flex-start", display: "flex", flexDirection: "column", gap: 12 }}>
      {mapControlsEl}
      <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, padding: "16px 12px 8px", overflow: "hidden" }}>
        {matrixOrEmpty(480)}
      </div>
      {legendBlock}
    </div>
  );

  // Stacked, collapsible map above the list (mobile / narrow). Short by default.
  const stackedMap = (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 12, background: C.surface, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: mapExpanded ? `1px solid ${C.border}` : "none" }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, letterSpacing: "0.08em", fontFamily: "'JetBrains Mono', monospace" }}>TRADEOFF MAP</span>
        <button onClick={toggleMapExpanded} aria-expanded={mapExpanded} data-no-print style={{ ...headerBtnStyle, padding: "3px 10px" }}>{mapExpanded ? "▲ Collapse" : "▼ Expand"}</button>
      </div>
      {mapExpanded && <div style={{ padding: "0 12px" }}>{mapControlsEl}</div>}
      <div style={{ padding: "8px 12px 12px" }}>
        {matrixOrEmpty(mapExpanded ? 420 : 200)}
      </div>
      {mapExpanded && <div style={{ padding: "0 12px 12px" }}>{legendBlock}</div>}
    </div>
  );

  return (
    <div role="main" id="main-content" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Header bar */}
      <div style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Priorities</h2>
        <Pill color={C.accent} dimColor={C.accentDim} small>{filtersActive ? `${filteredDisplayOrder.length}/${features.length}` : features.length} CANDIDATES</Pill>
        <Pill color={C.blue} dimColor={C.blueDim} small>RICE</Pill>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
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
      <div ref={measureRef} style={{ flex: 1, overflowY: "auto", maxHeight: isMobile ? "none" : "calc(100vh - 48px - 52px)", padding: 20, display: "flex", flexDirection: "column", gap: 12, paddingBottom: isMobile ? 72 : 20 }}>
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

        {unifiedFilters}
        {showForm && <Form key={editingFeature?.id || "new"} onAdd={onAddFeature} onCancel={() => { onShowForm(false); onEditingFeature(null); }} editFeature={editingFeature} productContext={productContext} onScoreEvent={onScoreEvent} onResolveScores={onResolveScores} feedbackContext={feedbackContext} />}
        {importData && <ImportPanel importData={importData} onConfirm={onConfirmImport} onCancel={onCancelImport} />}

        {/* List + tradeoff map. The map is skipped entirely until there are
            candidates so the onboarding flow stays clean. */}
        {!hasCandidates ? (
          listCards
        ) : sideBySide ? (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
              {sortToggle}
              {listCards}
            </div>
            {sideMap}
          </div>
        ) : (
          <>
            {stackedMap}
            {sortToggle}
            {listCards}
          </>
        )}
      </div>
    </div>
  );
};
