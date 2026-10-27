import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import Link from "next/link";
import "./components/app-shell.css";
import { sampleBacklogFor } from "./sample-backlog";
import { useC } from "./ThemeProvider";
import { exportCSV, parseCSV, mapCSVToFeatures } from "./utils";
import { load, saveWsIndex, loadWsIndex, saveWsFeatures, saveWsFeaturesChecked, loadWsFeatures, removeWsFeatures, saveWsContext, saveWsContextChecked, loadWsContext, removeWsContext, getActiveWsId, setActiveWsId as storeActiveWsId, STORAGE_KEY, saveWsDecisions, loadWsDecisions, removeWsDecisions, saveWsSignals, loadWsSignals, removeWsSignals, saveWsSettings, loadWsSettings, removeWsSettings } from "../lib/local-storage";
import * as cloud from "../lib/cloud-storage";
import { prepareRelayDemo, RELAY_DEMO_ID, RELAY_DEMO_WORKSPACE } from "../lib/relay-demo";
import { trackUsage } from "../lib/usage-events";
import { useMedia } from "./hooks/useMedia";
import { useScored } from "./hooks/useScored";
import { useAuth } from "./hooks/useAuth";
import { MigrationBanner } from "./components/MigrationBanner";
import { LeftRail } from "./components/LeftRail";
import { CenterCanvas } from "./components/CenterCanvas";
import { RightRail } from "./components/RightRail";
import { AdvisorPanel } from "./components/AdvisorPanel";
import { ShortcutsOverlay } from "./components/ShortcutsOverlay";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StatusToast } from "./components/StatusToast";
import { OfflineBanner } from "./components/OfflineBanner";
import { ThemeMenu } from "./components/ThemeMenu";
import { OrgSwitcher } from "./components/OrgSwitcher";
import { dialog, DialogHost } from "./components/dialog";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import * as feedbackLocal from "../lib/feedback-storage";
import { computeSummaryMetrics, buildScoreCalibration, buildAnalysisContext } from "../lib/feedback-context";
import { makeDecisionReview } from '../lib/decision-record';

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

// Browser preferences are scoped to the account and active organization.
// Always validate a remembered workspace against the current authorized list.
const workspacePreferenceKey = (userId, orgId) => `tarazu-cloud-workspace:${userId}:${orgId || "personal"}`;
const migrationPreferenceKey = userId => `tarazu-migration-dismissed:${userId}`;
const emptyContext = () => ({ productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" });

const prepareGuestDemo = async (reset = false) => {
  const prepare = () => prepareRelayDemo(localStorage, { reset });
  if (navigator.locks) await navigator.locks.request(RELAY_DEMO_ID, prepare);
  else prepare();
};

export default function App({ guestDemo = false }) {
  const C = useC();
  const [features, setFeatures] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingFeature, setEditingFeature] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [workspaceError, setWorkspaceError] = useState("");
  const [loadRetry, setLoadRetry] = useState(0);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const demoMeasured = useRef(false);
  useEffect(() => { if (guestDemo && loaded && !demoMeasured.current) { demoMeasured.current = true; trackUsage("demo_opened", "demo"); } }, [guestDemo, loaded]);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWsId, setActiveWsId] = useState(null);
  const [sortMode, setSortMode] = useState("rice");
  const [manualOrder, setManualOrder] = useState([]);
  const [dragId, setDragId] = useState(null);
  const [importData, setImportData] = useState(null);
  const [showMigration, setShowMigration] = useState(false);
  const [hasLocalImport, setHasLocalImport] = useState(false);
  const [browserFallback, setBrowserFallback] = useState(false);
  const [productContext, setProductContext] = useState({ productSummary: "", targetUsers: "", strategicPriorities: "", constraints: "", assumptions: "", successMetrics: "" });
  const [contextSaveStatus, setContextSaveStatus] = useState(null);
  const [feedbackSummary, setFeedbackSummary] = useState(null);
  const [feedbackContext, setFeedbackContext] = useState(null);
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const [activeScreen, setActiveScreen] = useState("home");
  const [quickStoryActive, setQuickStoryActive] = useState(false);
  const storyFocused = quickStoryActive && activeScreen === "home";
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
  const workspaceLoadSequence = useRef(0);
  const loadedSnapshot = useRef(null);
  const isMobile = useMedia("(max-width: 800px)");
  const isTablet = useMedia("(max-width: 1024px)") && !isMobile;
  const isOnline = useOnlineStatus();
  const auth = useAuth();
  const { isSignedIn, isLoaded: authLoaded, userId, orgId } = guestDemo
    ? { isSignedIn: false, isLoaded: true, userId: null, orgId: null } : auth;
  const authScope = `${guestDemo ? "demo" : "app"}:${authLoaded}:${isSignedIn}:${userId || "guest"}:${orgId || "personal"}`;
  const authScopeRef = useRef(authScope);
  // Invalidate during render, before an old request can resolve ahead of effects.
  if (authScopeRef.current !== authScope) {
    authScopeRef.current = authScope;
    workspaceLoadSequence.current += 1;
    loadedRef.current = false;
    loadedSnapshot.current = null;
    clearTimeout(saveTimer.current); clearTimeout(ctxSaveTimer.current); clearTimeout(settingsSaveTimer.current);
  }
  const departureSnapshotRef = useRef(null);
  departureSnapshotRef.current = { authScope, wsId: activeWsId, productContext, contextSaveStatus, browserFallback, isOnline };
  const currentSaveScope = `${userId || "guest"}:${orgId || "personal"}:${activeWsId}`;
  const saveScopeRef = useRef(currentSaveScope); saveScopeRef.current = currentSaveScope;
  const editorKey = `${currentSaveScope}:${activeScreen}:${showForm}:${editingFeature?.id || "new"}`;
  const editorSession = useRef({ key: editorKey, generation: 0 });
  if (editorSession.current.key !== editorKey) editorSession.current = { key: editorKey, generation: editorSession.current.generation + 1 };
  const featureWriteQueue = useRef(Promise.resolve());
  const featureWriteRevision = useRef(0);
  const contextWriteQueue = useRef(Promise.resolve());
  const contextWriteRevision = useRef(0);
  const enqueueContextWrite = operation => {
    const next = contextWriteQueue.current.catch(() => {}).then(operation);
    contextWriteQueue.current = next;
    return next;
  };
  const explicitSaving = useRef(false);
  const enqueueFeatureWrite = operation => {
    const next = featureWriteQueue.current.catch(() => {}).then(operation);
    featureWriteQueue.current = next;
    return next;
  };
  const captureWorkspaceRequest = useCallback(() => {
    const requestedScope = currentSaveScope;
    const generation = workspaceLoadSequence.current;
    return () => loadedRef.current && saveScopeRef.current === requestedScope && authScopeRef.current === authScope && workspaceLoadSequence.current === generation;
  }, [currentSaveScope, authScope]);
  const updateProductContext = useCallback(next => {
    if (loadedRef.current && authScopeRef.current === authScope && saveScopeRef.current === currentSaveScope) setProductContext(next);
  }, [authScope, currentSaveScope]);
  const { scored, sorted, maxScore } = useScored(features);
  const displayOrder = useMemo(() => {
    if (sortMode === "rice" || manualOrder.length === 0) return sorted;
    return manualOrder.map(id => scored.find(f => f.id === id)).filter(Boolean).concat(scored.filter(f => !manualOrder.includes(f.id)));
  }, [sortMode, sorted, scored, manualOrder]);

  const selectedFeature = useMemo(() =>
    selectedId ? scored.find(f => f.id === selectedId) || null : null,
  [selectedId, scored]);

  // ── Redirect off the advisor screen when resizing to desktop ──
  // The advisor only renders specially on mobile/tablet; on desktop
  // CenterCanvas returns null for it, leaving a blank center.
  useEffect(() => {
    if (!isMobile && !isTablet && activeScreen === "advisor") {
      setActiveScreen("priorities");
    }
  }, [isMobile, isTablet, activeScreen]);

  // ── Init: required data and context form one authorized snapshot. ──
  useEffect(() => {
    const loadId = ++workspaceLoadSequence.current;
    const current = () => loadId === workspaceLoadSequence.current && authScopeRef.current === authScope;
    loadedRef.current = false;
    loadedSnapshot.current = null;
    clearTimeout(saveTimer.current); clearTimeout(ctxSaveTimer.current); clearTimeout(settingsSaveTimer.current);
    setLoaded(false); setWorkspaceLoading(false); setWorkspaceError(""); setContextSaveStatus(null);
    setPendingSync(false);
    if (!authLoaded) return;
    const applySettings = settings => {
      setViewMode(settings?.viewMode || "list"); setSortMode(settings?.sortMode || "rice");
      setMapColorBy(settings?.mapColorBy || "tier"); setMapSizeBy(settings?.mapSizeBy || "uniform"); setMapLabelMode(settings?.mapLabelMode || "hover");
    };
    async function init() {
      if (guestDemo) {
        try { await prepareGuestDemo(); if (!current()) return; initLocal(); }
        catch (error) { if (current()) setDemoError(error.message || "Browser storage is unavailable."); return; }
      } else if (isSignedIn) {
        let readingContext = false;
        try {
          let ws = await cloud.fetchWorkspaces();
          if (!current()) return;
          if (ws.length === 0) {
            const newWs = await cloud.createWorkspace("My Backlog");
            if (!current()) return;
            ws = [newWs];
          }
          let rememberedId;
          try { if (userId) rememberedId = localStorage.getItem(workspacePreferenceKey(userId, orgId)); } catch {}
          const activeId = ws.find(w => w.id === rememberedId)?.id || ws[0].id;
          const data = await cloud.fetchFeatures(activeId);
          if (!current()) return;
          readingContext = true;
          const ctx = await cloud.fetchProductContext(activeId);
          const [d, signalsData, settings] = await Promise.all([
            cloud.fetchDecisions(activeId).catch(() => ({ decisions: [] })),
            cloud.fetchSignals(activeId).catch(() => ({ signals: [] })),
            cloud.fetchWorkspaceSettings(activeId).catch(() => ({})),
          ]);
          if (!current()) return;
          setWorkspaces(ws.map(w => ({ id: w.id, name: w.name })));
          setActiveWsId(activeId); setBrowserFallback(false);
          setFeatures(data.features || []); setManualOrder(data.manualOrder || []);
          setProductContext(ctx || emptyContext()); setDecisions(d.decisions || []); setSignals(signalsData.signals || []);
          applySettings(settings);
          loadedSnapshot.current = { authScope, wsId: activeId };
          const localWs = loadWsIndex();
          let migrationDismissed = false;
          try { migrationDismissed = !!userId && localStorage.getItem(migrationPreferenceKey(userId)) === "1"; } catch {}
          setHasLocalImport(!!localWs?.length); setShowMigration(!!localWs?.length && !migrationDismissed);
        } catch (err) {
          if (!current()) return;
          if (readingContext) {
            // A failed context read is never an empty context eligible for PUT.
            setWorkspaceError("Could not load this team's workspace context. Workspace context has not been changed. Check your connection and retry.");
            return;
          }
          console.error("Cloud init failed, falling back to localStorage:", err);
          initLocal();
        }
      } else initLocal();
      if (!current()) return;
      setSelectedId(null); setShowForm(false); setEditingFeature(null);
      setUndoSnapshot(null); setImportData(null); setDragId(null);
      setFeedbackSummary(null); setFeedbackContext(null);
      loadedRef.current = true; setLoaded(true);
    }
    function initLocal() {
      setBrowserFallback(true); setPendingSync(false);
      let ws = guestDemo ? [RELAY_DEMO_WORKSPACE] : loadWsIndex();
      if (!ws || ws.length === 0) {
        ws = [{ id: "default", name: "My Backlog" }];
        const legacy = load();
        if (legacy && legacy.length > 0) {
          saveWsFeatures("default", legacy);
          try { localStorage.removeItem(STORAGE_KEY); } catch {}
        } else saveWsFeatures("default", []);
        saveWsIndex(ws);
      }
      const remembered = getActiveWsId();
      const activeId = guestDemo ? RELAY_DEMO_ID : ws.find(w => w.id === remembered)?.id || ws[0].id;
      setWorkspaces(ws); setActiveWsId(activeId);
      const saved = loadWsFeatures(activeId);
      setFeatures(saved?.features || []); setManualOrder(saved?.manualOrder || []);
      setProductContext(loadWsContext(activeId) || emptyContext());
      setDecisions(loadWsDecisions(activeId)); setSignals(loadWsSignals(activeId));
      applySettings(loadWsSettings(activeId));
      loadedSnapshot.current = { authScope, wsId: activeId };
    }
    init();
    return () => { if (current()) workspaceLoadSequence.current += 1; };
  }, [authLoaded, isSignedIn, userId, orgId, guestDemo, authScope, loadRetry]);

  const dismissMigration = () => {
    try { if (userId) localStorage.setItem(migrationPreferenceKey(userId), "1"); } catch {}
    setShowMigration(false);
  };

  useEffect(() => {
    const updateDismissal = event => {
      if (userId && event.key === migrationPreferenceKey(userId)) setShowMigration(event.newValue !== "1" && !!loadWsIndex()?.length);
    };
    window.addEventListener("storage", updateDismissal);
    return () => window.removeEventListener("storage", updateDismissal);
  }, [userId]);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
  }, []);

  // ── Auto-save ──
  useEffect(() => {
    if (!loadedRef.current || loadedSnapshot.current?.authScope !== authScope || loadedSnapshot.current?.wsId !== activeWsId || !activeWsId || explicitSaving.current) return;
    const requestedScope = currentSaveScope;
    const requestedRevision = featureWriteRevision.current;
    const requestedGeneration = workspaceLoadSequence.current;
    const scopeCurrent = () => loadedRef.current && requestedGeneration === workspaceLoadSequence.current && authScopeRef.current === authScope && saveScopeRef.current === requestedScope;
    if (isSignedIn && !browserFallback) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        if (!scopeCurrent() || featureWriteRevision.current !== requestedRevision) return;
        if (!isOnline) {
          saveWsFeatures(activeWsId, features, manualOrder);
          setPendingSync(true);
          return;
        }
        try {
          const pendingDeletes = [...deletedIdsRef.current];
          const idMap = await enqueueFeatureWrite(() => scopeCurrent() && featureWriteRevision.current === requestedRevision ? cloud.syncFeatures(activeWsId, features, manualOrder, pendingDeletes) : null);
          if (!scopeCurrent() || featureWriteRevision.current !== requestedRevision) return;
          pendingDeletes.forEach(id => deletedIdsRef.current.delete(id));
          if (idMap && Object.keys(idMap).length > 0) {
            setFeatures(prev => prev.map(f => idMap[f.id] ? { ...f, id: idMap[f.id] } : f));
            setManualOrder(prev => prev.map(id => idMap[id] || id));
            if (selectedId && idMap[selectedId]) setSelectedId(idMap[selectedId]);
          }
        } catch (err) {
          if (!scopeCurrent() || featureWriteRevision.current !== requestedRevision) return;
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
  }, [features, manualOrder, loaded, activeWsId, isSignedIn, isOnline, showToast, currentSaveScope, browserFallback, workspaceLoading, authScope]);

  // ── Auto-save product context ──
  useEffect(() => {
    if (!loadedRef.current || loadedSnapshot.current?.authScope !== authScope || loadedSnapshot.current?.wsId !== activeWsId || !activeWsId) return;
    let cancelled = false;
    const generation = workspaceLoadSequence.current;
    const revision = ++contextWriteRevision.current;
    const requestedScope = currentSaveScope;
    const current = () => !cancelled && loadedRef.current && generation === workspaceLoadSequence.current && saveScopeRef.current === requestedScope && authScopeRef.current === authScope && revision === contextWriteRevision.current;
    const status = (state, message) => { if (current()) setContextSaveStatus({ state, message }); };
    const saveBrowser = pending => {
      if (!current()) return;
      try {
        saveWsContextChecked(activeWsId, productContext);
        status(pending ? "pending" : "saved", pending ? "Context saved in this browser; cloud sync is pending." : "Context saved in this browser.");
        if (pending) setPendingSync(true);
      } catch { status("error", "Context could not be saved. Your changes remain in this tab; copy them before leaving and retry by editing the frame."); }
    };
    if (isSignedIn && !browserFallback) {
      status("saving", "Saving workspace context…");
      ctxSaveTimer.current = setTimeout(async () => {
        if (!current()) return;
        if (!isOnline) { saveBrowser(true); return; }
        try {
          await enqueueContextWrite(() => current() ? cloud.saveProductContext(activeWsId, productContext) : undefined);
          status("saved", "Context saved to this workspace.");
        } catch { saveBrowser(true); }
      }, 1000);
    } else saveBrowser(false);
    return () => { cancelled = true; clearTimeout(ctxSaveTimer.current); };
  }, [productContext, loaded, activeWsId, isSignedIn, isOnline, browserFallback, workspaceLoading, authScope, currentSaveScope]);

  // ── Auto-save settings ──
  useEffect(() => {
    if (!loadedRef.current || loadedSnapshot.current?.authScope !== authScope || loadedSnapshot.current?.wsId !== activeWsId || !activeWsId) return;
    const settings = { viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode };
    const generation = workspaceLoadSequence.current;
    const requestedScope = currentSaveScope;
    const current = () => loadedRef.current && generation === workspaceLoadSequence.current && authScopeRef.current === authScope && saveScopeRef.current === requestedScope;
    if (isSignedIn && !browserFallback) {
      clearTimeout(settingsSaveTimer.current);
      settingsSaveTimer.current = setTimeout(async () => {
        if (!current()) return;
        if (!isOnline) {
          saveWsSettings(activeWsId, settings);
          setPendingSync(true);
          return;
        }
        try { await cloud.saveWorkspaceSettings(activeWsId, settings); } catch (err) {
          if (!current()) return;
          console.error("Settings save failed, falling back to localStorage:", err);
          saveWsSettings(activeWsId, settings);
          setPendingSync(true);
        }
      }, 500);
      return () => clearTimeout(settingsSaveTimer.current);
    } else {
      saveWsSettings(activeWsId, settings);
    }
  }, [viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode, loaded, activeWsId, isSignedIn, isOnline, browserFallback, workspaceLoading, authScope, currentSaveScope]);

  // ── Reconnect sync: when back online with pending changes ──
  useEffect(() => {
    if (!isOnline || !pendingSync || !isSignedIn || browserFallback || !activeWsId || !loadedRef.current || loadedSnapshot.current?.authScope !== authScope || loadedSnapshot.current?.wsId !== activeWsId) return;
    let cancelled = false;
    const requestedScope = currentSaveScope;
    const requestedRevision = featureWriteRevision.current;
    const generation = workspaceLoadSequence.current;
    const contextRevision = contextWriteRevision.current;
    const current = () => !cancelled && loadedRef.current && generation === workspaceLoadSequence.current && authScopeRef.current === authScope && saveScopeRef.current === requestedScope;
    async function sync() {
      try {
        const pendingDeletes = [...deletedIdsRef.current];
        await enqueueFeatureWrite(() => !cancelled && saveScopeRef.current === requestedScope && featureWriteRevision.current === requestedRevision ? cloud.syncFeatures(activeWsId, features, manualOrder, pendingDeletes) : null);
        if (!current() || featureWriteRevision.current !== requestedRevision) return;
        pendingDeletes.forEach(id => deletedIdsRef.current.delete(id));
        await enqueueContextWrite(() => current() && contextWriteRevision.current === contextRevision ? cloud.saveProductContext(activeWsId, productContext) : undefined);
        if (contextWriteRevision.current !== contextRevision || !current() || featureWriteRevision.current !== requestedRevision) return;
        await cloud.saveWorkspaceSettings(activeWsId, { viewMode, sortMode, mapColorBy, mapSizeBy, mapLabelMode });
        if (!cancelled && saveScopeRef.current === requestedScope && featureWriteRevision.current === requestedRevision) {
          setPendingSync(false);
          showToast("Changes synced to cloud", "success");
        }
      } catch (err) {
        console.error("Reconnect sync failed:", err);
        if (!cancelled && saveScopeRef.current === requestedScope && featureWriteRevision.current === requestedRevision) showToast("Sync failed — will retry", "error");
      }
    }
    sync();
    return () => { cancelled = true; };
  }, [isOnline, pendingSync, isSignedIn, activeWsId, features, currentSaveScope, browserFallback, workspaceLoading, authScope]);

  const addFeature = async (f) => {
    if (!activeWsId || !loadedRef.current) throw new Error("Wait for this workspace to finish loading before saving.");
    if (explicitSaving.current) throw new Error("A candidate is already being saved. Please wait.");
    const scope = currentSaveScope;
    const editorGeneration = editorSession.current.generation;
    const wsId = activeWsId;
    const signedIn = isSignedIn && !browserFallback;
    const nextFeatures = features.some(x => x.id === f.id) ? features.map(x => x.id === f.id ? f : x) : [...features, f];
    const localSave = () => saveWsFeaturesChecked(wsId, nextFeatures, manualOrder);
    let savedFeature = f;
    let savedTo = "browser";
    let awaitingSync = signedIn;
    explicitSaving.current = true;
    featureWriteRevision.current += 1;
    clearTimeout(saveTimer.current);
    try {
      await enqueueFeatureWrite(async () => {
        if (saveScopeRef.current !== scope) throw new Error("Workspace changed. Return to the original workspace before saving these edits.");
        if (signedIn && isOnline) {
          try {
            const result = await cloud.upsertFeature(wsId, f);
            savedFeature = { ...f, id: result.id || f.id };
            savedTo = "cloud";
            awaitingSync = false;
          } catch {
            localSave();
          }
        } else localSave();
        // Invalidate background snapshots queued while this save was in flight.
        featureWriteRevision.current += 1;
      });
      if (saveScopeRef.current !== scope) return { savedTo, pendingSync: awaitingSync };
      setFeatures(prev => prev.some(x => x.id === f.id) ? prev.map(x => x.id === f.id ? savedFeature : x) : [...prev, savedFeature]);
      if (savedFeature.id !== f.id) {
        setManualOrder(prev => prev.map(id => id === f.id ? savedFeature.id : id));
        if (selectedId === f.id) setSelectedId(savedFeature.id);
      }
      if (awaitingSync) setPendingSync(true);
      if (editorSession.current.generation === editorGeneration) { setShowForm(false); setEditingFeature(null); }
      const storageLabel = savedTo === "cloud" ? "Saved to cloud" : awaitingSync ? "Saved in this browser · pending sync" : "Saved in this browser";
      showToast(storageLabel, awaitingSync ? "warning" : "success");
      return { savedTo, pendingSync: awaitingSync, storageLabel };
    } catch (err) {
      throw new Error(err.message || "Could not save. Your edits are still here.");
    } finally { explicitSaving.current = false; }
  };
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
        ? { ...f, name: revertedFeature.name, description: revertedFeature.description, scoringBasis: revertedFeature.scoringBasis || {}, reach: revertedFeature.reach, impact: revertedFeature.impact, confidence: revertedFeature.confidence, effort: revertedFeature.effort }
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
    const current = captureWorkspaceRequest();
    if (!current()) return;
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (!current()) return;
      const result = mapCSVToFeatures(parseCSV(ev.target.result));
      if (result && result.features.length > 0) {
        setImportData({ ...result, scope: currentSaveScope });
        setShowForm(false);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const confirmImport = () => {
    if (!importData || !loadedRef.current || importData.scope !== saveScopeRef.current) return;
    setFeatures(prev => [...prev, ...importData.features]);
    setImportData(null);
  };

  const switchWorkspace = useCallback(async (wsId) => {
    if (guestDemo || authScopeRef.current !== authScope || loadedSnapshot.current?.authScope !== authScope) return;
    // Async workspace creation may hold an older callback. Depart with the
    // latest source context, never the context captured before that request.
    const source = departureSnapshotRef.current;
    if (source?.authScope !== authScope || source.wsId !== loadedSnapshot.current.wsId) return;
    const loadId = ++workspaceLoadSequence.current;
    const current = () => loadId === workspaceLoadSequence.current && authScopeRef.current === authScope;
    loadedRef.current = false;
    clearTimeout(saveTimer.current); clearTimeout(ctxSaveTimer.current); clearTimeout(settingsSaveTimer.current);
    setWorkspaceLoading(true); setWorkspaceError(""); setContextSaveStatus(null);
    if (isSignedIn) {
      try {
        // A workspace change must not discard an edit still in the debounce window.
        if (!source.browserFallback && source.contextSaveStatus?.state !== "saved") {
          if (!source.isOnline) throw new Error("Wait until you are online and the workspace context has saved before switching.");
          await enqueueContextWrite(() => current() ? cloud.saveProductContext(source.wsId, source.productContext) : undefined);
          if (!current()) return;
          setContextSaveStatus({ state: "saved", message: "Context saved to this workspace." });
        }
        const [data, ctx, d, signalsData, settings] = await Promise.all([
          cloud.fetchFeatures(wsId),
          cloud.fetchProductContext(wsId),
          cloud.fetchDecisions(wsId).catch(() => ({ decisions: [] })),
          cloud.fetchSignals(wsId).catch(() => ({ signals: [] })),
          cloud.fetchWorkspaceSettings(wsId).catch(() => ({})),
        ]);
        if (!current()) return;
        // Commit one workspace snapshot together; never expose mixed AI context.
        setBrowserFallback(false);
        setFeatures(data.features || []);
        setManualOrder(data.manualOrder || []);
        setProductContext(ctx || {});
        setDecisions(d.decisions || []);
        setSignals(signalsData.signals || []);
        setSortMode(settings?.sortMode || "rice");
        setViewMode(settings?.viewMode || "list");
        setMapColorBy(settings?.mapColorBy || "tier");
        setMapSizeBy(settings?.mapSizeBy || "uniform");
        setMapLabelMode(settings?.mapLabelMode || "hover");
      } catch (err) {
        if (!current()) return;
        console.error("Failed to load workspace:", err);
        loadedRef.current = true;
        setWorkspaceLoading(false);
        setWorkspaceError("Could not load the selected workspace or finish saving the current context. Your previous workspace and changes are still open. Check your connection and select the workspace again to retry.");
        return;
      }
    } else {
      if (loaded && activeWsId) saveWsFeatures(activeWsId, features, manualOrder);
      const saved = loadWsFeatures(wsId);
      setBrowserFallback(true);
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
    loadedSnapshot.current = { authScope, wsId };
    loadedRef.current = true;
    setWorkspaceLoading(false); setPendingSync(false);
    setActiveWsId(wsId);
    if (!isSignedIn) storeActiveWsId(wsId);
    else if (userId) {
      try { localStorage.setItem(workspacePreferenceKey(userId, orgId), wsId); } catch {}
    }
    setSelectedId(null);
    setShowForm(false);
    setEditingFeature(null);
    setUndoSnapshot(null); setImportData(null); setDragId(null);
    setFeedbackSummary(null); setFeedbackContext(null);
  }, [isSignedIn, userId, orgId, loaded, activeWsId, features, manualOrder, guestDemo, authScope]);

  const addWorkspace = async () => {
    if (guestDemo) return;
    const requestedAuth = authScope;
    const generation = workspaceLoadSequence.current;
    const current = () => authScopeRef.current === requestedAuth && generation === workspaceLoadSequence.current;
    const name = await dialog.prompt({ title: "New workspace", label: "Workspace name", placeholder: "e.g. Q3 Roadmap", confirmText: "Create" });
    if (!name?.trim() || !current()) return;
    if (isSignedIn) {
      try {
        const ws = await cloud.createWorkspace(name.trim());
        if (!current()) return;
        setWorkspaces(previous => [...previous, { id: ws.id, name: ws.name }]);
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
    if (guestDemo) return;
    const requestedAuth = authScope;
    const generation = workspaceLoadSequence.current;
    const current = () => authScopeRef.current === requestedAuth && generation === workspaceLoadSequence.current;
    if (workspaces.length <= 1) return;
    const ws = workspaces.find(w => w.id === wsId);
    const ok = await dialog.confirm({
      title: "Delete workspace?",
      message: `"${ws?.name ?? "This workspace"}" and all its candidates, decisions, and signals will be permanently removed. This can't be undone.`,
      confirmText: "Delete",
      danger: true,
    });
    if (!ok || !current()) return;
    if (isSignedIn) {
      try { await cloud.deleteWorkspaceApi(wsId); } catch (err) { console.error(err); return; }
    } else {
      removeWsFeatures(wsId);
      removeWsContext(wsId);
      removeWsDecisions(wsId);
      removeWsSignals(wsId);
      removeWsSettings(wsId);
      localStorage.removeItem(`prioritize-ws-${wsId}-briefs`);
    }
    if (!current()) return;
    const updated = workspaces.filter(w => w.id !== wsId);
    setWorkspaces(updated);
    if (!isSignedIn) saveWsIndex(updated);
    if (activeWsId === wsId) switchWorkspace(updated[0].id);
  };
  const renameWorkspace = async (wsId, newName) => {
    if (guestDemo) return;
    const requestedAuth = authScope;
    const ws = workspaces.find(w => w.id === wsId);
    const name = newName || await dialog.prompt({ title: "Rename workspace", label: "Workspace name", defaultValue: ws?.name, confirmText: "Rename" });
    if (!name?.trim() || authScopeRef.current !== requestedAuth) return;
    if (isSignedIn) {
      try { await cloud.renameWorkspaceApi(wsId, name.trim()); } catch (err) { console.error(err); return; }
    }
    if (authScopeRef.current !== requestedAuth) return;
    setWorkspaces(previous => {
      const updated = previous.map(w => w.id === wsId ? { ...w, name: name.trim() } : w);
      if (!isSignedIn) saveWsIndex(updated);
      return updated;
    });
  };

  const handleMigration = async () => {
    const requestedAuth = authScope;
    const current = () => authScopeRef.current === requestedAuth;
    const localWs = loadWsIndex();
    if (!localWs) return;
    try {
      for (const lw of localWs) {
        if (!current()) return;
        const ws = await cloud.createWorkspace(lw.name);
        if (!current()) return;
        const saved = loadWsFeatures(lw.id);
        if (saved?.features) {
          for (const f of saved.features) {
            if (!current()) return;
            await cloud.upsertFeature(ws.id, f);
          }
        }
      }
      // Keep the browser copy available for offline fallback and review.
      if (!current()) return;
      dismissMigration();
      // Reload cloud data
      const ws = await cloud.fetchWorkspaces();
      if (!current()) return;
      setWorkspaces(ws.map(w => ({ id: w.id, name: w.name })));
    } catch (err) {
      console.error("Migration failed:", err);
      throw new Error("Import could not finish. Your browser data is still available. Please try again.");
    }
  };

  // ── Load feedback data for current workspace ──
  useEffect(() => {
    const current = captureWorkspaceRequest();
    if (!loaded || !activeWsId || !current()) return;
    let cancelled = false;
    const applySummary = value => { if (!cancelled && current()) setFeedbackSummary(value); };
    const applyContext = value => { if (!cancelled && current()) setFeedbackContext(value); };
    if (isSignedIn) {
      cloud.fetchFeedbackSummary(activeWsId).then(applySummary).catch(() => applySummary(null));
      cloud.fetchFeedbackContext(activeWsId).then(applyContext).catch(() => applyContext(null));
    } else {
      const scoreEvents = feedbackLocal.loadScoreEvents(activeWsId);
      const analysisEvents = feedbackLocal.loadAnalysisEvents(activeWsId);
      applySummary(computeSummaryMetrics(scoreEvents, analysisEvents));
      applyContext({
        scoreCalibration: buildScoreCalibration(scoreEvents),
        analysisContext: buildAnalysisContext(analysisEvents),
      });
    }
    return () => { cancelled = true; };
  }, [loaded, activeWsId, isSignedIn, captureWorkspaceRequest, workspaceLoading]);

  const refreshFeedback = useCallback(() => {
    const current = captureWorkspaceRequest();
    if (!activeWsId || !current()) return;
    if (isSignedIn) {
      cloud.fetchFeedbackSummary(activeWsId).then(value => { if (current()) setFeedbackSummary(value); }).catch(() => {});
      cloud.fetchFeedbackContext(activeWsId).then(value => { if (current()) setFeedbackContext(value); }).catch(() => {});
    } else {
      const scoreEvents = feedbackLocal.loadScoreEvents(activeWsId);
      const analysisEvents = feedbackLocal.loadAnalysisEvents(activeWsId);
      setFeedbackSummary(computeSummaryMetrics(scoreEvents, analysisEvents));
      setFeedbackContext({
        scoreCalibration: buildScoreCalibration(scoreEvents),
        analysisContext: buildAnalysisContext(analysisEvents),
      });
    }
  }, [activeWsId, isSignedIn, captureWorkspaceRequest]);

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
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      const result = await cloud.createDecision(activeWsId, decision);
      if (current()) setDecisions(prev => [...prev, result]);
    } else {
      const newDecision = { ...decision, id: `dec-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setDecisions(prev => { const updated = [...prev, newDecision]; saveWsDecisions(activeWsId, updated); return updated; });
    }
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const handleUpdateDecision = useCallback(async (decisionId, updates) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      try {
        const result = await cloud.updateDecision(activeWsId, decisionId, updates);
        if (current()) setDecisions(prev => prev.map(d => d.id === decisionId ? { ...result, reviews: d.reviews || [] } : d));
      } catch (err) { console.error("Update decision failed:", err); throw err; }
    } else {
      setDecisions(prev => {
        const updated = prev.map(d => d.id === decisionId ? { ...d, ...updates, updated_at: new Date().toISOString() } : d);
        saveWsDecisions(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const handleReviewDecision = useCallback(async (decisionId, input) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    const scope = currentSaveScope;
    if (!activeWsId) throw new Error('Choose a workspace first.');
    if (isSignedIn) {
      const review = await cloud.createDecisionReview(activeWsId, decisionId, input);
      if (current() && saveScopeRef.current === scope) setDecisions(prev => prev.map(d => d.id === decisionId ? { ...d, reviews: [...(d.reviews || []), review] } : d));
      return review;
    }
    const append = () => {
      const key = `prioritize-ws-${activeWsId}-decisions`;
      const stored = localStorage.getItem(key);
      const records = stored ? JSON.parse(stored) : decisions;
      const decision = records.find(d => d.id === decisionId);
      if (!decision) throw new Error('This decision is no longer available.');
      const review = makeDecisionReview(decision, input, signals);
      const updated = records.map(d => d.id === decisionId ? { ...d, reviews: [...(d.reviews || []), review] } : d);
      // Write before displaying success: a full or blocked browser store must
      // leave the review draft open and the original record untouched.
      localStorage.setItem(key, JSON.stringify(updated));
      if (current() && saveScopeRef.current === scope) setDecisions(updated);
      return review;
    };
    return navigator.locks ? navigator.locks.request(`tarazu-review:${activeWsId}`, append) : append();
  }, [isSignedIn, activeWsId, currentSaveScope, decisions, signals, captureWorkspaceRequest]);

  const handleDeleteDecision = useCallback(async (decisionId) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      try { await cloud.deleteDecisionApi(activeWsId, decisionId); } catch (err) { console.error(err); return; }
    }
    if (!current()) return;
    setDecisions(prev => {
      const updated = prev.filter(d => d.id !== decisionId);
      if (!isSignedIn) saveWsDecisions(activeWsId, updated);
      return updated;
    });
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  // ── Signal handlers ──
  const handleAddSignal = useCallback(async (signal) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      const result = await cloud.createSignal(activeWsId, signal);
      if (current()) setSignals(prev => [result, ...prev]);
    } else {
      const newSignal = { ...signal, id: `sig-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      setSignals(prev => { const updated = [newSignal, ...prev]; saveWsSignals(activeWsId, updated); return updated; });
    }
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const handleUpdateSignal = useCallback(async (signalId, updates) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      try {
        const result = await cloud.updateSignal(activeWsId, signalId, updates);
        if (current()) setSignals(prev => prev.map(s => s.id === signalId ? result : s));
      } catch (err) { console.error("Update signal failed:", err); }
    } else {
      setSignals(prev => {
        const updated = prev.map(s => s.id === signalId ? { ...s, ...updates, updated_at: new Date().toISOString() } : s);
        saveWsSignals(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const handleDeleteSignal = useCallback(async (signalId) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      try { await cloud.deleteSignalApi(activeWsId, signalId); } catch (err) { console.error(err); return; }
    }
    if (!current()) return;
    setSignals(prev => {
      const updated = prev.filter(s => s.id !== signalId);
      if (!isSignedIn) saveWsSignals(activeWsId, updated);
      return updated;
    });
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const handleImportSignals = useCallback(async (signalsList) => {
    const current = captureWorkspaceRequest();
    if (!current()) return;
    if (isSignedIn && activeWsId) {
      try {
        await cloud.importSignals(activeWsId, signalsList);
        if (!current()) return;
        const fresh = await cloud.fetchSignals(activeWsId);
        if (current()) setSignals(fresh.signals || []);
      } catch (err) { console.error("Import signals failed:", err); }
    } else {
      setSignals(prev => {
        const withIds = signalsList.map((s, i) => ({ ...s, id: `sig-${Date.now()}-${i}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
        const updated = [...withIds, ...prev];
        saveWsSignals(activeWsId, updated);
        return updated;
      });
    }
  }, [isSignedIn, activeWsId, captureWorkspaceRequest]);

  const activeWs = workspaces.find(w => w.id === activeWsId);
  const ownDecisionStarted = useRef(false);
  useEffect(() => {
    if (guestDemo || !loaded || ownDecisionStarted.current) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("start") !== "decision") return;
    ownDecisionStarted.current = true;
    trackUsage("personal_started");
    setActiveScreen("priorities"); setSelectedId(null); setEditingFeature(null); setShowForm(true);
    url.searchParams.delete("start");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, [guestDemo, loaded]);


  const handleScreenChange = useCallback((screen) => {
    setActiveScreen(screen);
    setSelectedId(null);
  }, []);

  const handleLoadSamples = useCallback(() => {
    if (!loadedRef.current || saveScopeRef.current !== currentSaveScope) return;
    if (guestDemo) { showToast("Use Restart demo above to restore the complete Relay example."); return; }
    const examples = sampleBacklogFor(features);
    if (!examples) {
      showToast("Your candidates are unchanged. Create an empty workspace to try examples.");
      return;
    }
    setUndoSnapshot({ features, selectedId, manualOrder, sortMode, scope: currentSaveScope });
    setFeatures(examples);
    setActiveScreen("priorities");
    setSelectedId(null);
    setManualOrder([]);
    setSortMode("rice");
  }, [features, selectedId, manualOrder, sortMode, showToast, guestDemo, currentSaveScope]);

  const handleClear = useCallback(() => {
    if (!loadedRef.current || saveScopeRef.current !== currentSaveScope) return;
    setUndoSnapshot({ features, selectedId, manualOrder, sortMode, scope: currentSaveScope });
    setFeatures([]);
    setSelectedId(null);
    setManualOrder([]);
    setSortMode("rice");
  }, [features, selectedId, manualOrder, sortMode, currentSaveScope]);

  const handleUndo = useCallback(() => {
    if (!undoSnapshot || !loadedRef.current || undoSnapshot.scope !== saveScopeRef.current) return;
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
        case "/": if (activeScreen === "priorities") { e.preventDefault(); searchRef.current?.focus(); } break;
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
  }, [activeScreen, handleScreenChange]);

  const restartDemo = async () => {
    if (!await dialog.confirm({ title: "Restart the Relay demo?", message: "This replaces your edits to the fictional demo in this browser. Your own workspaces are kept.", confirmText: "Restart demo" })) return;
    await featureWriteQueue.current.catch(() => {});
    loadedRef.current = false;
    setLoaded(false);
    clearTimeout(saveTimer.current); clearTimeout(ctxSaveTimer.current); clearTimeout(settingsSaveTimer.current);
    try {
      await prepareGuestDemo(true);
      window.location.reload();
    } catch (error) {
      loadedRef.current = loaded;
      setLoaded(loaded);
      setDemoError(error.message || "The demo could not be restored.");
    }
  };

  if (!loaded || loadedSnapshot.current?.authScope !== authScope) return (
    <main className="tz-app" style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: C.bg, color: C.text, fontFamily: "var(--body)" }}>
      {workspaceError ? <section style={{ maxWidth: 500, padding: 24 }}><h1>Workspace could not open</h1><p role="alert">{workspaceError}</p><button onClick={() => setLoadRetry(n => n + 1)}>Retry workspace load</button></section> : demoError ? <section style={{ maxWidth: 500, padding: 24 }}><h1>Relay demo could not open</h1><p role="alert">{demoError} Allow browser storage and try again, or restart the example.</p><button onClick={() => window.location.reload()}>Try again</button> <button onClick={restartDemo}>Restart demo</button> <Link href="/app">Open your workspace</Link><DialogHost /></section> : <p role="status" style={{ fontSize: 14, color: C.textMuted }}>Loading your workspace…</p>}
    </main>
  );

  return (
    <div className={`tz-app${isMobile ? " tz-app-mobile" : ""}`} style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "var(--body)" }}>
      <style>{printStyles}</style>
      <style>{animStyles}</style>
      <style>{`.tz-app :is(button, a, input, select, textarea, [tabindex]):focus-visible { outline: 2px solid ${C.accent} !important; outline-offset: 3px; }`}</style>
      <style>{`.skip-link { position: absolute; top: -40px; left: 0; padding: 8px 16px; background: ${C.accent}; color: ${C.bg}; font-size: 12px; font-weight: 700; z-index: 1000; text-decoration: none; border-radius: 0 0 8px 0; } .skip-link:focus { top: 0; }`}</style>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleImportFile} style={{ display: "none" }} />

      {isSignedIn && showMigration && <MigrationBanner onConfirm={handleMigration} onDismiss={dismissMigration} />}

      {isSignedIn && hasLocalImport && !showMigration && activeScreen === "settings" && <div style={{ padding: "10px 20px", borderBottom: `1px solid ${C.border}` }}><button onClick={() => setShowMigration(true)} style={{ border: `1px solid ${C.border}`, background: C.surface, color: C.text, borderRadius: 6, padding: "8px 12px", cursor: "pointer", fontSize: 14 }}>Review browser data for import</button></div>}
      {workspaceError && <p role="alert" style={{ margin: 0, padding: "12px 20px", color: C.text }}>{workspaceError}</p>}
      {workspaceLoading && <p role="status" style={{ margin: 0, padding: "12px 20px" }}>Loading selected workspace…</p>}
      {/* Top bar */}
      <header role="banner" style={{
        height: 48, padding: "0 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, zIndex: 50, background: C.bg,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link href="/" aria-label="Tarazu home" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", color: "inherit" }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg, ${C.brass}, ${C.brassDeep})`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 16px ${C.brass}25` }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="2"><line x1="4" y1="6" x2="20" y2="6" strokeLinecap="round"/><line x1="12" y1="6" x2="12" y2="20" strokeLinecap="round"/><circle cx="5" cy="6" r="2" fill={C.bg} stroke="none"/><circle cx="19" cy="6" r="2" fill={C.bg} stroke="none"/></svg>
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 800, margin: 0, letterSpacing: "-0.03em", fontFamily: "var(--display)", color: C.text }}>Tarazu</h1>
          </Link>
          {!isMobile && <span style={{ fontSize: 9, color: C.textDim, fontFamily: "var(--mono)", letterSpacing: "0.06em" }}>DEFENSIBLE PRIORITIZATION</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
          {!isMobile && (
            <a href="/pricing" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.textMuted, fontFamily: "var(--mono)", textDecoration: "none" }}>
              Pricing
            </a>
          )}
          {!isMobile && (
            <a href="/frameworks/rice" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, color: C.textMuted, fontFamily: "var(--mono)", textDecoration: "none" }}>
              RICE Guide
            </a>
          )}
          {!isMobile && !guestDemo && <OrgSwitcher />}
          <Link href="/contact" aria-label="Feedback and contact" style={{ color: C.textMuted, fontSize: 12 }}>{isMobile ? "Help" : "Feedback"}</Link>
          <ThemeMenu compact={isMobile} />
          {isMobile && !guestDemo && (
          <div ref={mobileWsRef} onKeyDown={e => { if (e.key === "Escape") { e.stopPropagation(); setMobileWsOpen(false); mobileWsRef.current?.querySelector("button")?.focus(); } }} style={{ position: "relative" }}>
            <button aria-expanded={mobileWsOpen} onClick={() => setMobileWsOpen(!mobileWsOpen)} style={{
              padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 6,
              background: "transparent", color: C.textMuted, fontSize: 11, cursor: "pointer",
              fontFamily: "var(--mono)", display: "flex", alignItems: "center", gap: 4,
            }}>
              <span style={{ maxWidth: 75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeWs?.name || "Workspace"}</span>
              <span style={{ fontSize: 8, color: C.textDim }}>{mobileWsOpen ? "▲" : "▼"}</span>
            </button>
            {mobileWsOpen && (
              <div className="tz-mobile-workspace-menu" style={{
                position: "absolute", top: "calc(100% + 4px)", right: 0, minWidth: 200,
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10,
                boxShadow: `0 8px 24px color-mix(in srgb, var(--surface-base) 50%, transparent)`, zIndex: 300, overflow: "hidden",
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
                    cursor: "pointer", fontFamily: "var(--mono)",
                  }}>
                  + New Workspace
                </button>
              </div>
            )}
          </div>
        )}
        </div>
      </header>

      {guestDemo && !storyFocused && <section data-no-print aria-label="Guest demo" style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", fontSize: 13, lineHeight: 1.5 }}><strong>Relay · fictional guest demo</strong><br /><span style={{ color: C.textMuted }}>Explore the fictional example in this browser. Start your own decision with a blank candidate; your existing work is kept. <Link href="/sign-in?start=decision" style={{ color: C.accent }}>Sign in first</Link> for cloud saving and AI.</span></div>
        <Link href="/app?start=decision" style={{ color: C.accent, fontSize: 13, fontWeight: 700 }}>Start your own decision</Link>
        <Link href="/app" style={{ color: C.textMuted, fontSize: 13 }}>Open saved work</Link>
        <button onClick={restartDemo} style={{ padding: "8px 12px", borderRadius: 6, border: `1px solid ${C.border}`, background: "transparent", color: C.text, cursor: "pointer", fontSize: 13 }}>Restart demo</button>
        {demoError && <p role="alert" style={{ width: "100%", color: C.danger, margin: 0 }}>{demoError}</p>}
      </section>}

      {!guestDemo && ownDecisionStarted.current && showForm && !editingFeature && <section aria-label="Your own decision" style={{ padding: "12px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface, fontSize: 14, lineHeight: 1.6 }}>
        <strong>New candidate in {activeWs?.name || "your workspace"}.</strong> Existing candidates stay in place. {isSignedIn ? "Save your candidate when it’s ready." : <>You’re working in this browser. <Link href="/sign-in?start=decision" style={{ color: C.accent }}>Sign in first</Link> for cloud saving and AI.</>} <Link href="/demo" style={{ color: C.accent }}>Return to the Relay demo</Link>
      </section>}

      {isSignedIn && <OfflineBanner isOnline={isOnline} isSyncing={pendingSync && isOnline} />}

      <div style={{
        display: isMobile ? "flex" : "grid",
        flexDirection: isMobile ? "column" : undefined,
        gridTemplateColumns: isMobile ? undefined
          : isTablet || storyFocused ? "64px 1fr"
          : showForm && activeScreen === "priorities" ? "64px 1fr" : "64px 1fr 360px",
        minHeight: "calc(100vh - 48px)",
      }}>
        {!isMobile && (
          <LeftRail guestDemo={guestDemo}
            activeScreen={activeScreen} onScreenChange={handleScreenChange}
            activeWs={activeWs} workspaces={workspaces}
            onSwitchWorkspace={switchWorkspace} onAddWorkspace={addWorkspace}
            onDeleteWorkspace={deleteWorkspace} onRenameWorkspace={renameWorkspace}
            isMobile={false} isSignedIn={isSignedIn} advisorInNav={isTablet}
          />
        )}

        <div style={{ display: "contents" }} inert={workspaceLoading ? "" : undefined} aria-busy={workspaceLoading || undefined}>
        <ErrorBoundary name="Content">
        {(isMobile || isTablet) && activeScreen === "advisor" ? (
          <div role="main" id="main-content" tabIndex={-1} style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: 0 }}>Advisor</h2>
            </div>
            <AdvisorPanel
              signals={signals} decisions={decisions} workspaceId={activeWsId}
              scored={scored}
              productContext={productContext} onProductContextChange={updateProductContext}
              onAnalysisEvent={handleAnalysisEvent} onAnalysisFeedback={handleAnalysisFeedback}
              feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
              onAddDecision={handleAddDecision} onScreenChange={handleScreenChange}
            />
          </div>
        ) : (
        <CenterCanvas key={currentSaveScope} guestDemo={guestDemo} settingsScope={currentSaveScope}
          onStoryActiveChange={setQuickStoryActive}
          activeScreen={activeScreen}
          saveTarget={isSignedIn && isOnline && !pendingSync && !browserFallback ? "cloud" : "browser"}
          savePendingSync={pendingSync && !browserFallback}
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
          onExportCSV={() => exportCSV(displayOrder, activeWs?.name, C)}
          contextSaveStatus={contextSaveStatus} productContext={productContext} onProductContextChange={updateProductContext} onScoreEvent={handleScoreEvent}
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
          onAddDecision={handleAddDecision} onUpdateDecision={handleUpdateDecision} onDeleteDecision={handleDeleteDecision} onReviewDecision={handleReviewDecision}
          onAddSignal={handleAddSignal} onUpdateSignal={handleUpdateSignal} onDeleteSignal={handleDeleteSignal}
          onImportSignals={handleImportSignals}
          onScreenChange={handleScreenChange}
          searchRef={searchRef}
        />
        )}
        </ErrorBoundary>
        </div>

        {!isMobile && !isTablet && !(showForm && activeScreen === "priorities") && (
          <div hidden={storyFocused} inert={workspaceLoading ? "" : undefined} style={{ display: storyFocused ? "none" : "contents" }}>
          <ErrorBoundary name="Detail Panel">
          <RightRail
            selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
            scored={scored} maxScore={maxScore}
            onEditFeature={editFeature} onDeleteFeature={deleteFeature}
            onRevert={handleRevert}
            productContext={productContext} onProductContextChange={updateProductContext}
            onAnalysisEvent={handleAnalysisEvent}
            onAnalysisFeedback={handleAnalysisFeedback}
            feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
            isSignedIn={isSignedIn} activeWsId={activeWsId}
            isMobile={false} isTablet={false}
            signals={signals} decisions={decisions} onScreenChange={handleScreenChange} onAddDecision={handleAddDecision}
          />
          </ErrorBoundary>
          </div>
        )}
      </div>

      {/* Tablet: right rail as overlay when candidate selected */}
      {isTablet && selectedFeature && !showForm && !storyFocused && (
        <div style={{ display: "contents" }} inert={workspaceLoading ? "" : undefined}>
        <ErrorBoundary name="Detail Panel">
        <RightRail
          selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
          scored={scored} maxScore={maxScore}
          onEditFeature={editFeature} onDeleteFeature={deleteFeature}
          onRevert={handleRevert}
          productContext={productContext} onProductContextChange={updateProductContext}
          onAnalysisEvent={handleAnalysisEvent}
          onAnalysisFeedback={handleAnalysisFeedback}
          feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
          isSignedIn={isSignedIn} activeWsId={activeWsId}
          isMobile={false} isTablet={true}
          signals={signals} decisions={decisions} onScreenChange={handleScreenChange}
        />
        </ErrorBoundary>
        </div>
      )}

      {/* Mobile: right rail as bottom sheet overlay when candidate selected */}
      {isMobile && selectedFeature && !showForm && !storyFocused && (
        <div style={{ display: "contents" }} inert={workspaceLoading ? "" : undefined}>
        <ErrorBoundary name="Detail Panel">
        <RightRail
          selectedFeature={selectedFeature} onDeselect={() => setSelectedId(null)}
          scored={scored} maxScore={maxScore}
          onEditFeature={editFeature} onDeleteFeature={deleteFeature}
          onRevert={handleRevert}
          productContext={productContext} onProductContextChange={updateProductContext}
          onAnalysisEvent={handleAnalysisEvent}
          onAnalysisFeedback={handleAnalysisFeedback}
          feedbackContext={feedbackContext} feedbackSummary={feedbackSummary}
          isSignedIn={isSignedIn} activeWsId={activeWsId}
          isMobile={true} isTablet={false}
          signals={signals} decisions={decisions} onScreenChange={handleScreenChange}
        />
        </ErrorBoundary>
        </div>
      )}

      {/* Mobile: bottom tab bar */}
      {isMobile && (
        <LeftRail guestDemo={guestDemo}
          activeScreen={activeScreen} onScreenChange={handleScreenChange}
          activeWs={activeWs} workspaces={workspaces}
          onSwitchWorkspace={switchWorkspace} onAddWorkspace={addWorkspace}
          onDeleteWorkspace={deleteWorkspace} onRenameWorkspace={renameWorkspace}
          isMobile={true} isSignedIn={isSignedIn} advisorInNav={true}
        />
      )}

      {showShortcuts && <ShortcutsOverlay onClose={() => setShowShortcuts(false)} />}
      <StatusToast message={toast?.message} type={toast?.type} onDismiss={() => setToast(null)} />
      <DialogHost />
    </div>
  );
}
