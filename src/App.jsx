import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { C, SAMPLES } from "./theme";
import { exportCSV, parseCSV, mapCSVToFeatures } from "./utils";
import { load, saveWsIndex, loadWsIndex, saveWsFeatures, loadWsFeatures, removeWsFeatures, saveWsContext, loadWsContext, removeWsContext, getActiveWsId, setActiveWsId as storeActiveWsId, STORAGE_KEY, saveWsDecisions, loadWsDecisions, removeWsDecisions, saveWsSignals, loadWsSignals, removeWsSignals, saveWsSettings, loadWsSettings, removeWsSettings } from "../lib/local-storage";
import * as cloud from "../lib/cloud-storage";
import { useMedia } from "./hooks/useMedia";
import { useScored } from "./hooks/useScored";
import { useAuth } from "./hooks/useAuth";
import { MigrationBanner } from "./components/MigrationBanner";
import { LeftRail } from "./components/LeftRail";
import { CenterCanvas } from "./components/CenterCanvas";
import { RightRail } from "./components/RightRail";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StatusToast } from "./components/StatusToast";
import { OfflineBanner } from "./components/OfflineBanner";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import * as feedbackLocal from "../lib/feedback-storage";
import { computeSummaryMetrics, buildScoreCalibration, buildAnalysisContext } from "../lib/feedback-context";

const animStyles = `
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInRight { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
`;

const printStyles = `@media print {
  body { background: #fff !important; color: #1a1a1a !important; -webkit-print-color-adjust: exact; }
  [data-no-print] { display: none !important; }
  [data-print-only] { display: block !important; }
  div { break-inside: avoid; }
  @page { margin: 1.5cm; }
  header { position: static !important; border-bottom: 2px solid #333 !important; background: #fff !important; }
  header h1 { background: none !important; -webkit-text-fill-color: #1a1a1a !important; color: #1a1a1a !important; }
  header span { color: #666 !important; }
}`;

export default function App() {
  const [features, setFeatures] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWsId, setActiveWsId] = useState(null);
  const [sortMode, setSortMode] = useState("rice");
  const [manualOrder, setManualOrder] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [importData, setImportData] = useState(null);
  const [showMigration, setShowMigration] = useState(false);
  const [productContext, setProductContext] = useState({ productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" });
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackContext, setFeedbackContext] = useState(null);
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [activeScreen, setActiveScreen] = useState("home");
  const [viewMode, setViewMode] = useState("list");
  const [mobileWsOpen, setMobileWsOpen] = useState(false);
  const mobileWsRef = useRef(null);
  const [mapColorBy, setMapColorBy] = useState("tier");
  const [mapSizeBy, setMapSizeBy] = useState("uniform");
  const [mapLabelMode, setMapLabelMode] = useState("hover");
  const [decisions, setDecisions] = useState([]);
  const [signals, setSignals] = useState([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [toast, setToast] = useState(null);
  const [pendingSync, setPendingSync] = useState(false);
  const fileInputRef = useRef(null);
  const searchRef = useRef(null);
  const saveTimer = useRef(null);
  // Feature IDs the user explicitly deleted but that may not yet be removed
  // from the cloud (e.g. deleted while offline). syncFeatures deletes only
  // these — never "remote not in local" — so another device's features survive.
  const deletedIdsRef = useRef(new Set());
  const ctxSaveTimer = useRef(null);
  const settingsSaveTimer = useRef(null);
  const loadedRef = useRef(false);
  const isMobile = useMedia("(max-width: 800px)");
  const isTablet = useMedia("(max-width: 1024px)") && !isMobile;
  const isOnline = useOnlineStatus();
  const { isSignedIn, isLoaded: authLoaded } = useAuth();
  const { scored, sorted, maxScore } = useScored(features);
  const displayOrder = useMemo(() => {
    if (sortMode === "rice" || manualOrder.length === 0) return sorted;
    return manualOrder.map(id => scored.find(f => f.id === id)).filter(Boolean).concat(scored.filter(f => !manualOrder.includes(f.id)));
  }, [sortMode, sorted, scored, manualOrder]);

  const selectedFeature = useMemo(() =>
    selectedId ? scored.find(f => f.id === selectedId) || null : null,
  [selectedId, scored]);

  // ── Init: load data from cloud or localStorage ──
  useEffect(() => {
    if (!authLoaded) return;
    loadedRef.current = false;
    setLoaded(false);
    let cancelled = false;
    async function init() {
      if (isSignedIn) {
        try {
          let ws = await cloud.fetchWorkspaces();
          if (ws.length === 0) {
            const newWs = await cloud.createWorkspace("My Backlog");
            ws = [newWs];
          }
          if (cancelled) return;
          setWorkspaces(ws.map(w => ({ id: w.id, name: w.name })));
          const activeId = ws[0].id;
          setActiveWsId(activeId);
          const data = await cloud.fetchFeatures(activeId);
          if (cancelled) return;
          setFeatures(data.features);
          setManualOrder(data.manualOrder || []);
          try { const ctx = await cloud.fetchProductContext(activeId); if (!cancelled) setProductContext(ctx); } catch {}
          try { const d = await cloud.fetchDecisions(activeId); if (!cancelled) setDecisions(d.decisions || []); } catch { if (!cancelled) setDecisions([]); }
          try { const s = await cloud.fetchSignals(activeId); if (!cancelled) setSignals(s.signals || []); } catch { if (!cancelled) setSignals([]); }
          // Load UI settings from cloud
          try {
            const settings = await cloud.fetchWorkspaceSettings(activeId);
            if (!cancelled && settings) {
              if (settings.viewMode) setViewMode(settings.viewMode);
              if (settings.sortMode) setSortMode(settings.sortMode);
              if (settings.mapColorBy) setMapColorBy(settings.mapColorBy);
              if (settings.mapSizeBy) setMapSizeBy(settings.mapSizeBy);
              if (settings.mapLabelMode) setMapLabelMode(settings.mapLabelMode);
            }
          } catch {}
          // Check if localStorage has data to migrate
          const localWs = loadWsIndex();
          if (localWs && localWs.length > 0) setShowMigration(true);
        } catch (err) {
          console.error("Cloud init failed, falling back to localStorage:", err);
          initLocal();
        }
      } else {
        initLocal();
      }
      loadedRef.current = true;
      setLoaded(true);
    }
    function initLocal() {
      let ws = loadWsIndex();
      if (!ws || ws.length === 0) {
        ws = [{ id: "default", name: "My Backlog" }];
        const legacy = load();
        if (legacy && legacy.length > 0) {
          saveWsFeatures("default", legacy);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
        } else {
          saveWsFeatures("default", []);
        }
        saveWsIndex(ws);
      }
      const activeId = getActiveWsId() || ws[0].id;
      setWorkspaces(ws);
      setActiveWsId(activeId);
      const saved = loadWsFeatures(activeId);
      if (saved) {
        setFeatures(saved.features);
        setManualOrder(saved.manualOrder || []);
      } else {
        setFeatures([]);
      }
      const ctx = loadWsContext(activeId);
      if (ctx) setProductContext(ctx);
      setDecisions(loadWsDecisions(activeId));
      setSignals(loadWsSignals(activeId));
      const settings = loadWsSettings(activeId);
      if (settings) {
        if (settings.viewMode) setViewMode(settings.viewMode);
        if (settings.sortMode) setSortMode(settings.sortMode);
        if (settings.mapColorBy) setMapColorBy(settings.mapColorBy);
        if (settings.mapSizeBy) setMapSizeBy(settings.mapSizeBy);
        if (settings.mapLabelMode) setMapLabelMode(settings.mapLabelMode);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [authLoaded, isSignedIn]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (!loadedRef.current || !activeWsId) return;
    if (isSignedIn) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!isOnline) {
          saveWsFeatures(activeWsId, features, manualOrder);
          setPendingSync(true);
          return;
        }
        try {
          const pendingDeletes = [...deletedIdsRef.current];
          const idMap = await cloud.syncFeatures(activeWsId, features, manualOrder, pendingDeletes);
          pendingDeletes.forEach(id => deletedIdsRef.current.delete(id));
          if (idMap && Object.keys(idMap).length > 0) {
            setFeatures(prev => prev.map(f => idMap[f.id] ? { ...f, id: idMap[f.id] } : f));
            setManualOrder(prev => prev.map(id => idMap[id] || id));
            if (selectedId && idMap[selectedId]) setSelectedId(idMap[selectedId]);
          }
        } catch (err) {
          console.error("Cloud save failed, falling back to localStorage:", err);
          saveWsFeatures(activeWsId, features, manualOrder);
          setPendingSync(true);
          showToast("Saved locally — will sync when online", "warning");
        }
      }, 1000);
      return () => clearTimeout(saveTimer.current);
    } else {
      saveWsFeatures(activeWsId, features, manualOrder);
    }
  }, [features, manualOrder, loaded, activeWsId, isSignedIn, isOnline, showToast]);

  // ── Auto-save product context ──
  useEffect(() => {
    if (!loadedRef.current || !activeWsId) return;
    if (isSignedIn) {
      clearTimeout(ctxSaveTimer.current);
      ctxSaveTimer.current = setTimeout(async () => {
        if (!isOnline) {
          saveWsContext(activeWsId, productContext);
          setPendingSync(true);
          return;
        }
        try { await cloud.saveProductContext(activeWsId, productContext); } catch (err) {
          console.error("Context save failed, falling back to localStorage:", err);
          saveWsContext(activeWsId, productContext);
          setPendingSync(true);
        }
      }, 1000);
      return () => clearTimeout(ctxSaveTimer.current);
    } else {
      saveWsContext(activeWsId, productContext);
    }
  }, [productContext, loaded, activeWsId, isSignedIn, isOnline]);

  // ── Auto-save settings ──
  useEffect(() => {
    if (!loadedRef.current || !activeWsId) return;
    const settings = { viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode };
    if (isSignedIn) {
      clearTimeout(settingsSaveTimer.current);
      settingsSaveTimer.current = setTimeout(async () => {
        if (!isOnline) {
          saveWsSettings(activeWsId, settings);
          setPendingSync(true);
          return;
        }
        try { await cloud.saveWorkspaceSettings(activeWsId, settings); } catch (err) {
          console.error("Settings save failed, falling back to localStorage:", err);
          saveWsSettings(activeWsId, settings);
          setPendingSync(true);
        }
      }, 500);
      return () => clearTimeout(settingsSaveTimer.current);
    } else {
      saveWsSettings(activeWsId, settings);
    }
  }, [viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode, activeWsId, isSignedIn, isOnline]);

  // ── Reconnect sync: when back online with pending changes ──
  useEffect(() => {
    if (!isOnline || !pendingSync || !isSignedIn || !activeWsId || !loadedRef.current) return;
    let cancelled = false;
    async function sync() {
      try {
        const pendingDeletes = [...deletedIdsRef.current];
        await cloud.syncFeatures(activeWsId, features, manualOrder, pendingDeletes);
        pendingDeletes.forEach(id => deletedIdsRef.current.delete(id));
        await cloud.saveProductContext(activeWsId, productContext);
        await cloud.saveWorkspaceSettings(activeWsId, { viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode });
        if (!cancelled) {
          setPendingSync(false);
          showToast("Changes synced to cloud", "success");
        }
      } catch (err) {
        console.error("Reconnect sync failed:", err);
        if (!cancelled) showToast("Sync failed — will retry", "error");
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [isOnline, pendingSync, isSignedIn, activeWsId]);

  const addFeature = (f) => { setFeatures(prev => prev.some(x => x.id === f.id) ? prev.map(x => x.id === f.id ? f : x) : [...prev, f]); setShowForm(false); setEditingFeature(null); };
  const deleteFeature = (id) => {
    setFeatures(prev => prev.filter(f => f.id !== id));
    setManualOrder(prev => prev.filter(x => x !== id));
    if (selectedId === id) setSelectedId(null);
    if (isSignedIn && activeWsId) {
      // Tombstone it so a later sync re-deletes it if this direct call fails
      // (e.g. offline). Cleared once a sync confirms the deletion.
      deletedIdsRef.current.add(id);
      cloud.deleteFeatureApi(activeWsId, id).catch(console.error);
    }
  };
  const editFeature = (f) => { const { score, ...raw } = f; setEditingFeature(raw); setShowForm(true); };
  const handleRevert = useCallback((revertedFeature) => {
    setFeatures(prev => prev.map(f =>
      f.id === revertedFeature.id
        ? { ...f, name: revertedFeature.name, description: revertedFeature.description, reach: revertedFeature.reach, impact: revertedFeature.impact, confidence: revertedFeature.confidence, effort: revertedFeature.effort }
        : f
    ));
  }, []);

  const handleDragStart = (id) => setDragId(id);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const currentOrder = manualOrder.length > 0 ? [...manualOrder] : sorted.map(f => f.id);
    const fromIdx = currentOrder.indexOf(dragId);
    const toIdx = currentOrder.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) { setDragId(null); return; }
    currentOrder.splice(fromIdx, 1);
    currentOrder.splice(toIdx, 0, dragId);
    setManualOrder(currentOrder);
    setSortMode("manual");
    setDragId(null);
  };
  const handleMove = (id, dir) => {
    const currentOrder = manualOrder.length > 0 ? [...manualOrder] : sorted.map(f => f.id);
    const idx = currentOrder.indexOf(id);
    const targetIdx = idx + dir;
    if (idx === -1 || targetIdx < 0 || targetIdx >= currentOrder.length) return;
    [currentOrder[idx], currentOrder[targetIdx]] = [currentOrder[targetIdx], currentOrder[idx]];
    setManualOrder(currentOrder);
    setSortMode("manual");
  };
  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = mapCSVToFeatures(parseCSV(ev.target.result));
      if (result && result.features.length > 0) {
        setImportData(result);
        setShowForm(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const confirmImport = () => {
    if (!importData) return;
    setFeatures(prev => [...prev, ...importData.features]);
    setImportData(null);
  };

  const switchWorkspace = useCallback(async (wsId) => {
    if (isSignedIn) {
      try {
        const data = await cloud.fetchFeatures(wsId);
        setFeatures(data.features || []);
        setManualOrder(data.manualOrder || []);
        try { const ctx = await cloud.fetchProductContext(wsId); setProductContext(ctx); } catch { setProductContext({ productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" }); }
        try { const d = await cloud.fetchDecisions(wsId); setDecisions(d.decisions || []); } catch { setDecisions([]); }
        try { const s = await cloud.fetchSignals(wsId); setSignals(s.signals || []); } catch { setSignals([]); }
        try {
          const settings = await cloud.fetchWorkspaceSettings(wsId);
          setSortMode(settings?.sortMode || "rice");
          setViewMode(settings?.viewMode || "list");
          setMapColorBy(settings?.mapColorBy || "tier");
          setMapSizeBy(settings?.mapSizeBy || "uniform");
          setMapLabelMode(settings?.mapLabelMode || "hover");
        } catch {
          setSortMode("rice"); setViewMode("list"); setMapColorBy("tier"); setMapSizeBy("uniform"); setMapLabelMode("hover");
        }
      } catch (err) {
        console.error("Failed to load workspace:", err);
        setFeatures([]);
        setManualOrder([]);
        setDecisions([]);
        setSignals([]);
      }
    } else {
      if (loaded && activeWsId) saveWsFeatures(activeWsId, features, manualOrder);
      const saved = loadWsFeatures(wsId);
      setFeatures(saved?.features || []);
      setManualOrder(saved?.manualOrder || []);
      const ctx = loadWsContext(wsId);
      setProductContext(ctx || { productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" });
      setDecisions(loadWsDecisions(wsId));
      setSignals(loadWsSignals(wsId));
      const settings = loadWsSettings(wsId);
      setSortMode(settings?.sortMode || "rice");
      setViewMode(settings?.viewMode || "list");
      setMapColorBy(settings?.mapColorBy || "tier");
      setMapSizeBy(settings?.mapSizeBy || "uniform");
      setMapLabelMode(settings?.mapLabelMode || "hover");
    }
    setActiveWsId(wsId);
    if (!isSignedIn) storeActiveWsId(wsId);
    setSelectedId(null);
    setShowForm(false);
    setEditingFeature(null);
  }, [isSignedIn, loaded, activeWsId, features, manualOrder]);

  const addWorkspace = async () => {
    const name = prompt("Workspace name:");
    if (!name?.trim()) return;
    if (isSignedIn) {
      try {
        const ws = await cloud.createWorkspace(name.trim());
        const updated = [...workspaces, { id: ws.id, name: ws.name }];
        setWorkspaces(updated);
        switchWorkspace(ws.id);
      } catch (err) {
        console.error("Failed to create workspace:", err);
      }
    } else {
      const ws = { id: `ws-${Date.now()}`, name: name.trim() };
      const updated = [...workspaces, ws];
      setWorkspaces(updated);
      saveWsIndex(updated);
      saveWsFeatures(ws.id, []);
      switchWorkspace(ws.id);
    }
  };
  const deleteWorkspace = async (wsId) => {
    if (workspaces.length <= 1) return;
    if (isSignedIn) {
      try { await cloud.deleteWorkspaceApi(wsId); } catch (err) { console.error(err); return; }
    } else {
      removeWsFeatures(wsId);
      removeWsContext(wsId);
      removeWsDecisions(wsId);
      removeWsSignals(wsId);
      removeWsSettings(wsId);
    }
    const updated = workspaces.filter(w => w.id !== wsId);
    setWorkspaces(updated);
    if (!isSignedIn) saveWsIndex(updated);
    if (activeWsId === wsId) switchWorkspace(updated[0].id);
  };
  const renameWorkspace = async (wsId, newName) => {
    const ws = workspaces.find(w => w.id === wsId);
    const name = newName || prompt("New name:", ws?.name);
    if (!name?.trim()) return;
    if (isSignedIn) {
      try { await cloud.renameWorkspaceApi(wsId, name.trim()); } catch (err) { console.error(err); return; }
    }
    const updated = workspaces.map(w => w.id === wsId ? { ...w, name: name.trim() } : w);
    setWorkspaces(updated);
    if (!isSignedIn) saveWsIndex(updated);
  };

  const handleMigration = async () => {
    const localWs = loadWsIndex();
    if (!localWs) return;
    try {
      for (const lw of localWs) {
        const ws = await cloud.createWorkspace(lw.name);
        const saved = loadWsFeatures(lw.id);
        if (saved?.features) {
          for (const f of saved.features) {
            await cloud.upsertFeature(ws.id, f);
          }
        }
      }
      // Clear localStorage after successful migration
      for (const lw of localWs) removeWsFeatures(lw.id);
      try { localStorage.removeItem("prioritize-workspaces"); localStorage.removeItem("prioritize-active-workspace"); localStorage.removeItem(STORAGE_KEY); } catch {}
      setShowMigration(false);
      // Reload cloud data
      const ws = await cloud.fetchWorkspaces();
      setWorkspaces(ws.map(w => ({ id: w.id, name: w.name })));
    } catch (err) {
      console.error("Migration failed:", err);
    }
  };

  // ── Load feedback data for current workspace ──
  useEffect(() => {
    if (!loaded || !activeWsId) return;
    if (isSignedIn) {
      cloud.fetchFeedbackSummary(activeWsId).then(setFeedbackSummary).catch(() => setFeedbackSummary(null));
      cloud.fetchFeedbackContext(activeWsId).then(setFeedbackContext).catch(() => setFeedbackContext(null));
    } else {
      const scoreEvents = feedbackLocal.loadScoreEvents(activeWsId);
      const analysisEvents = feedbackLocal.loadAnalysisEvents(activeWsId);
      setFeedbackSummary(computeSummaryMetrics(scoreEvents, analysisEvents));
      setFeedbackContext({
        scoreCalibration: buildScoreCalibration(scoreEvents),
        analysisContext: buildAnalysisContext(analysisEvents),
      });
    }
  }, [loaded, activeWsId, isSignedIn]);

  const refreshFeedback = useCallback(() => {
    if (!activeWsId) return;
    if (isSignedIn) {
      cloud.fetchFeedbackSummary(activeWsId).then(setFeedbackSummary).catch(() => {});
      cloud.fetchFeedbackContext(activeWsId).then(setFeedbackContext).catch(() => {});
    } else {
      const scoreEvents = feedbackLocal.loadScoreEvents(activeWsId);
      const analysisEvents = feedbackLocal.loadAnalysisEvents(activeWsId);
      setFeedbackSummary(computeSummaryMetrics(scoreEvents, analysisEvents));
      setFeedbackContext({
        scoreCalibration: buildScoreCalibration(scoreEvents),
        analysisContext: buildAnalysisContext(analysisEvents),
      });
    }
  }, [activeWsId, isSignedIn]);

  // ── Feedback handlers ──
  const handleScoreEvent = useCallback(async (events) => {
    if (!activeWsId) return;
    if (isSignedIn) {
      try { await cloud.postScoreEvents(activeWsId, events); } catch (err) { console.error("Score event failed:", err); }
    } else {
      for (const e of events) feedbackLocal.saveScoreEvent(activeWsId, e);
    }
  }, [activeWsId, isSignedIn]);

  const handleResolveScores = useCallback(async (featureId, finalScores) => {
    if (!activeWsId) return;
    if (isSignedIn) {
      try { await cloud.resolveScoreEvents(activeWsId, featureId, finalScores); } catch (err) { console.error("Resolve scores failed:", err); }
    } else {
      feedbackLocal.resolveScoreEvents(activeWsId, featureId, finalScores);
    }
    refreshFeedback();
  }, [activeWsId, isSignedIn, refreshFeedback]);

  const handleAnalysisEvent = useCallback(async (event) => {
    if (!activeWsId) return null;
    if (isSignedIn) {
      try {
        const result = await cloud.postAnalysisEvent(activeWsId, event);
        return result.id;
      } catch (err) { console.error("Analysis event failed:", err); return null; }
    } else {
      const saved = feedbackLocal.saveAnalysisEvent(activeWsId, event);
      return saved.id;
    }
  }, [activeWsId, isSignedIn]);

  const handleAnalysisFeedback = useCallback(async (eventId, thumbsUp) => {
    if (!activeWsId || !eventId) return;
    if (isSignedIn) {
      try { await cloud.updateAnalysisEvent(activeWsId, eventId, { thumbs_up: thumbsUp }); } catch (err) { console.error("Analysis feedback failed:", err); }
    } else {
      feedbackLocal.updateAnalysisEvent(activeWsId, eventId, { thumbs_up: thumbsUp });
    }
    refreshFeedback();
  }, [activeWsId, isSignedIn, refreshFeedback]);

  // ── Decision handlers ──
  const handleAddDecision = useCallback(async (decision) => {
    if (isSignedIn && activeWsId) {
      const result = await cloud.createDecision(activeWsId, decision);
      setDecisions(prev => [...prev, result]);
    } else {
      const newDecision = { ...decision, id: `dec-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setDecisions(prev => { const updated = [...prev, newDecision]; saveWsDecisions(activeWsId, updated); return updated; });
    }
  }, [isSignedIn, activeWsId]);

  const handleUpdateDecision = useCallback(async (decisionId, updates) => {
    if (isSignedIn && activeWsId) {
      try {
        const result = await cloud.updateDecision(activeWsId, decisionId, updates);
        setDecisions(prev => prev.map(d => d.id === decisionId ? result : d));
      } catch (err) { console.error("Update decision failed:", err); }
    } else {
      setDecisions(prev => {
        const updated = prev.map(d => d.id === decisionId ? { ...d, ...updates, updated_at: new Date().toISOString() } : d);
        saveWsDecisions(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId]);

  const handleDeleteDecision = useCallback(async (decisionId) => {
    if (isSignedIn && activeWsId) {
      try { await cloud.deleteDecisionApi(activeWsId, decisionId); } catch (err) { console.error(err); return; }
    }
    setDecisions(prev => {
      const updated = prev.filter(d => d.id !== decisionId);
      if (!isSignedIn) saveWsDecisions(activeWsId, updated);
      return updated;
    });
  }, [isSignedIn, activeWsId]);

  // ── Signal handlers ──
  const handleAddSignal = useCallback(async (signal) => {
    if (isSignedIn && activeWsId) {
      const result = await cloud.createSignal(activeWsId, signal);
      setSignals(prev => [result, ...prev]);
    } else {
      const newSignal = { ...signal, id: `sig-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setSignals(prev => { const updated = [newSignal, ...prev]; saveWsSignals(activeWsId, updated); return updated; });
    }
  }, [isSignedIn, activeWsId]);

  const handleUpdateSignal = useCallback(async (signalId, updates) => {
    if (isSignedIn && activeWsId) {
      try {
        const result = await cloud.updateSignal(activeWsId, signalId, updates);
        setSignals(prev => prev.map(s => s.id === signalId ? result : s));
      } catch (err) { console.error("Update signal failed:", err); }
    } else {
      setSignals(prev => {
        const updated = prev.map(s => s.id === signalId ? { ...s, ...updates, updated_at: new Date().toISOString() } : s);
        saveWsSignals(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId]);

  const handleDeleteSignal = useCallback(async (signalId) => {
    if (isSignedIn && activeWsId) {
      try { await cloud.deleteSignalApi(activeWsId, signalId); } catch (err) { console.error(err); return; }
    }
    setSignals(prev => {
      const updated = prev.filter(s => s.id !== signalId);
      if (!isSignedIn) saveWsSignals(activeWsId, updated);
      return updated;
    });
  }, [isSignedIn, activeWsId]);

  const handleImportSignals = useCallback(async (signalsList) => {
    if (isSignedIn && activeWsId) {
      try {
        await cloud.importSignals(activeWsId, signalsList);
        const fresh = await cloud.fetchSignals(activeWsId);
        setSignals(fresh.signals || []);
      } catch (err) { console.error("Import signals failed:", err); }
    } else {
      setSignals(prev => {
        const withIds = signalsList.map((s, i) => ({ ...s, id: `sig-${Date.now()}-${i}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
        const updated = [...withIds, ...prev];
        saveWsSignals(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId]);

  const activeWs = workspaces.find(w => w.id === activeWsId);

  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    setSelectedId(null);
  }, []);

  const handleLoadSamples = useCallback(() => {
    setUndoSnapshot({ features, selectedId, manualOrder, sortMode });
    setFeatures(SAMPLES);
    setSelectedId(null);
    setManualOrder([]);
    setSortMode("rice");
  }, [features, selectedId, manualOrder, sortMode]);

  const handleClear = useCallback(() => {
    setUndoSnapshot({ features, selectedId, manualOrder, sortMode });
    setFeatures([]);
    setSelectedId(null);
    setManualOrder([]);
    setSortMode("rice");
  }, [features, selectedId, manualOrder, sortMode]);

  const handleUndo = useCallback(() => {
    if (!undoSnapshot) return;
    setFeatures(undoSnapshot.features);
    setSelectedId(undoSnapshot.selectedId);
    setManualOrder(undoSnapshot.manualOrder);
    setSortMode(undoSnapshot.sortMode);
    setUndoSnapshot(null);
  }, [undoSnapshot]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const SCREENS = ["home", "priorities", "signals", "decisions", "scenarios"];
    const handler = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "?": e.preventDefault(); setShowShortcuts(v => !v); break;
        case "Escape": setShowShortcuts(false); setSelectedId(null); setShowForm(false); setEditingFeature(null); break;
        case "n": if (activeScreen === "priorities") { e.preventDefault(); setEditingFeature(null); setShowForm(true); } break;
        case "/": if (activeScreen === "priorities" && viewMode === "list") { e.preventDefault(); searchRef.current?.focus(); } break;
        case "1": case "2": case "3": case "4": case "5": {
          const screen = SCREENS[parseInt(e.key) - 1];
          if (screen) handleScreenChange(screen);
          break;
        }
        default: break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [activeScreen, viewMode, handleScreenChange]);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{printStyles}</style>
      <style>{animStyles}</style>
      <style>{`.skip-link { position: absolute; top: -40px; left: 0; padding: 8px 16px; background: ${C.accent}; color: ${C.bg}; font-size: 12px; font-weight: 700; z-index: 1000; text-decoration: none; border-radius: 0 0 8px 0; } .skip-link:focus { top: 0; }`}</style>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: "none" }} />

      {showMigration && <MigrationBanner onConfirm={handleMigration} onDismiss={() => setShowMigration(false)} />}

      {/* Top bar */}
      <header role="banner" style={{
        height: 48, padding: "0 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, background: C.bg,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.blue}, ${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${C.blue}25` }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="12" y1="6" x2="12" y2="20" strokeLinecap="round"/><circle cx="5" cy="6" r="2" fill={C.bg} stroke="none"/><circle cx="19" cy="6" r="2" fill={C.bg} stroke="none"/></svg>
          </div>
          <h1 style={{ fontSize: 16, fontWeight: 800, margin: 0, letterSpacing: "-0.02em", background: `linear-gradient(135deg, ${C.text}, ${C.textMuted})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Tarazu</h1>
          {!isMobile && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}>DECISION INTELLIGENCE</span>}
        </div>
        {isMobile && (
          <div ref={mobileWsRef} style={{ position: "relative" }}>
            <button onClick={() => setMobileWsOpen(!mobileWsOpen)} style={{
              padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
              background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeWs?.name || "Workspace"}</span>
              <span style={{ fontSize: 8, color: C.textDim }}>{mobileWsOpen ? "▲" : "▼"}</span>
            </button>
            {mobileWsOpen && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 200,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                boxShadow: `0 8px 24px ${C.bg}80`, zIndex: 300, overflow: "hidden",
              }}>
                {workspaces.map(w => (
                  <button key={w.id} onClick={() => { if (w.id !== activeWsId) switchWorkspace(w.id); setMobileWsOpen(false); }}
                    style={{
                      width: "100%", padding: "10px 14px", border: "none", textAlign: "left",
                      background: w.id === activeWsId ? C.accentGlow : "transparent",
                      color: w.id === activeWsId ? C.accent : C.text, fontSize: 12,
                      fontWeight: w.id === activeWsId ? 700 : 400, cursor: "pointer",
                      borderBottom: `1px solid ${C.border}`,
                    }}>
                    {w.name}
                  </button>
                ))}
                <button onClick={() => { addWorkspace(); setMobileWsOpen(false); }}
                  style={{
                    width: "100%", padding: "10px 14px", border: "none", textAlign: "left",
                    background: "transparent", color: C.accent, fontSize: 11, fontWeight: 600,
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  }}>
                  + New Workspace
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {isSignedIn && <OfflineBanner isOnline={isOnline} isSyncing={pendingSync && isOnline} />}

      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined
          : isTablet ? "64px 1fr"
          : "64px 1fr 360px",
        minHeight: "calc(100vh - 48px)",
      }}>
        {!isMobile && (
          <LeftRail
            activeScreen={activeScreen} onScreenChange={handleScreenChange}
            activeWs={activeWs} workspaces={workspaces}
            onSwitchWorkspace={switchWorkspace} onAddWorkspace={addWorkspace}
            onDeleteWorkspace={deleteWorkspace} onRenameWorkspace={renameWorkspace}
            isMobile={false} isSignedIn={isSignedIn}
          />
        )}

        <ErrorBoundary name="Content">
        <CenterCanvas
          activeScreen={activeScreen} viewMode={viewMode} onViewModeChange={setViewMode}
          features={features} scored={scored} sorted={sorted} displayOrder={displayOrder}
          maxScore={maxScore} selectedId={selectedId} onSelect={setSelectedId}
          showForm={showForm} onShowForm={setShowForm}
          editingFeature={editingFeature} onEditingFeature={setEditingFeature}
          onAddFeature={addFeature} onDeleteFeature={deleteFeature} onEditFeature={editFeature}
          sortMode={sortMode} onSortModeChange={setSortMode}
          manualOrder={manualOrder} onManualOrderChange={setManualOrder}
          onDragStart={handleDragStart} onDragOver={handleDragOver} onDrop={handleDrop}
          dragId={dragId} onMove={handleMove}
          undoSnapshot={undoSnapshot} onUndo={handleUndo} onLoadSamples={handleLoadSamples} onClear={handleClear}
          importData={importData} onConfirmImport={confirmImport} onCancelImport={() => setImportData(null)}
          onImportFile={() => fileInputRef.current?.click()}
          onExportCSV={() => exportCSV(displayOrder, activeWs?.name)}
          productContext={productContext} onScoreEvent={handleScoreEvent}
          onResolveScores={handleResolveScores} feedbackContext={feedbackContext}
          isMobile={isMobile}
          mapColorBy={mapColorBy} mapSizeBy={mapSizeBy} mapLabelMode={mapLabelMode}
          onMapColorByChange={setMapColorBy} onMapSizeByChange={setMapSizeBy}
          onMapLabelModeChange={setMapLabelMode}
          activeWs={activeWs} workspaces={workspaces}
          onSwitchWorkspace={switchWorkspace} onAddWorkspace={addWorkspace}
          onDeleteWorkspace={deleteWorkspace} onRenameWorkspace={renameWorkspace}
          isSignedIn={isSignedIn} activeWsId={activeWsId}
          decisions={decisions} signals={signals}
          onAddDecision={handleAddDecision} onUpdateDecision={handleUpdateDecision} onDeleteDecision={handleDeleteDecision}
          onAddSignal={handleAddSignal} onUpdateSignal={handleUpdateSignal} onDeleteSignal={handleDeleteSignal}
          onImportSignals={handleImportSignals}
          onScreenChange={handleScreenChange}
          searchRef={searchRef}
        />
        </ErrorBoundary>

        {!isMobile && !isTablet && (
          <ErrorBoundary name="Detail Panel">
          <RightRail
            selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
            scored={scored} maxScore={maxScore}
            onEditFeature={editFeature} onDeleteFeature={deleteFeature}
            onRevert={handleRevert}
            productContext={productContext} onProductContextChange={setProductContext}
            onAnalysisEvent={handleAnalysisEvent}
            onAnalysisFeedback={handleAnalysisFeedback}
            feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
            isSignedIn={isSignedIn} activeWsId={activeWsId}
            isMobile={false} isTablet={false}
            signals={signals} onScreenChange={handleScreenChange} onAddDecision={handleAddDecision}
          />
          </ErrorBoundary>
        )}
      </div>

      {/* Tablet: right rail as overlay when candidate selected */}
      {isTablet && selectedFeature && (
        <ErrorBoundary name="Detail Panel">
        <RightRail
          selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
          scored={scored} maxScore={maxScore}
          onEditFeature={editFeature} onDeleteFeature={deleteFeature}
          onRevert={handleRevert}
          productContext={productContext} onProductContextChange={setProductContext}
          onAnalysisEvent={handleAnalysisEvent}
          onAnalysisFeedback={handleAnalysisFeedback}
          feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
          isSignedIn={isSignedIn} activeWsId={activeWsId}
          isMobile={false} isTablet={true}
          signals={signals} onScreenChange={handleScreenChange}
        />
        </ErrorBoundary>
      )}

      {/* Mobile: right rail as bottom sheet overlay when candidate selected */}
      {isMobile && selectedFeature && (
        <ErrorBoundary name="Detail Panel">
        <RightRail
          selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
          scored={scored} maxScore={maxScore}
          onEditFeature={editFeature} onDeleteFeature={deleteFeature}
          onRevert={handleRevert}
          productContext={productContext} onProductContextChange={setProductContext}
          onAnalysisEvent={handleAnalysisEvent}
          onAnalysisFeedback={handleAnalysisFeedback}
          feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
          isSignedIn={isSignedIn} activeWsId={activeWsId}
          isMobile={true} isTablet={false}
          signals={signals} onScreenChange={handleScreenChange}
        />
        </ErrorBoundary>
      )}

      {/* Mobile: bottom tab bar */}
      {isMobile && (
        <LeftRail
          activeScreen={activeScreen} onScreenChange={handleScreenChange}
          activeWs={activeWs} workspaces={workspaces}
          onSwitchWorkspace={switchWorkspace} onAddWorkspace={addWorkspace}
          onDeleteWorkspace={deleteWorkspace} onRenameWorkspace={renameWorkspace}
          isMobile={true} isSignedIn={isSignedIn}
        />
      )}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
      <StatusToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
    </div>
  );
}
