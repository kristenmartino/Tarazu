export const STORAGE_KEY = "prioritize-features-v1"; // legacy, kept for migration
const WS_INDEX_KEY = "prioritize-workspaces";
const WS_ACTIVE_KEY = "prioritize-active-workspace";

export const save = (features) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(features)); } catch {} };
export const load = () => { try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : null; } catch { return null; } };
export const saveWsIndex = (ws) => { try { localStorage.setItem(WS_INDEX_KEY, JSON.stringify(ws)); } catch {} };
export const loadWsIndex = () => { try { const d = localStorage.getItem(WS_INDEX_KEY); return d ? JSON.parse(d) : null; } catch { return null; } };

export const saveWsFeatures = (wsId, features, manualOrder = []) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}`, JSON.stringify({ features, manualOrder })); } catch {}
};

// Explicit user saves must surface storage failure instead of claiming success.
export const saveWsFeaturesChecked = (wsId, features, manualOrder = []) => {
  localStorage.setItem(`prioritize-ws-${wsId}`, JSON.stringify({ features, manualOrder }));
  return true;
};

export const loadWsFeatures = (wsId) => {
  try {
    const d = localStorage.getItem(`prioritize-ws-${wsId}`);
    if (!d) return null;
    const parsed = JSON.parse(d);
    // Backwards-compat: old format stored a plain array
    if (Array.isArray(parsed)) return { features: parsed, manualOrder: [] };
    return { features: parsed.features || [], manualOrder: parsed.manualOrder || [] };
  } catch { return null; }
};

export const removeWsFeatures = (wsId) => {
  try { localStorage.removeItem(`prioritize-ws-${wsId}`); } catch {}
};

export const saveWsContext = (wsId, ctx) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}-context`, JSON.stringify(ctx)); } catch {}
};
export const loadWsContext = (wsId) => {
  try { const d = localStorage.getItem(`prioritize-ws-${wsId}-context`); return d ? JSON.parse(d) : null; } catch { return null; }
};
export const removeWsContext = (wsId) => {
  try { localStorage.removeItem(`prioritize-ws-${wsId}-context`); } catch {}
};

export const getActiveWsId = () => localStorage.getItem(WS_ACTIVE_KEY);
export const setActiveWsId = (id) => localStorage.setItem(WS_ACTIVE_KEY, id);

// ─── Decisions (guest mode) ─────────────────────────────────────────

export const saveWsDecisions = (wsId, decisions) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}-decisions`, JSON.stringify(decisions)); } catch {}
};
export const loadWsDecisions = (wsId) => {
  try { const d = localStorage.getItem(`prioritize-ws-${wsId}-decisions`); return d ? JSON.parse(d) : []; } catch { return []; }
};
export const removeWsDecisions = (wsId) => {
  try { localStorage.removeItem(`prioritize-ws-${wsId}-decisions`); } catch {}
};

// ─── Signals (guest mode) ───────────────────────────────────────────

export const saveWsSignals = (wsId, signals) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}-signals`, JSON.stringify(signals)); } catch {}
};
export const loadWsSignals = (wsId) => {
  try { const d = localStorage.getItem(`prioritize-ws-${wsId}-signals`); return d ? JSON.parse(d) : []; } catch { return []; }
};
export const removeWsSignals = (wsId) => {
  try { localStorage.removeItem(`prioritize-ws-${wsId}-signals`); } catch {}
};

// ─── Settings (per-workspace UI prefs) ─────────────────────────────

export const saveWsSettings = (wsId, settings) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}-settings`, JSON.stringify(settings)); } catch {}
};
export const loadWsSettings = (wsId) => {
  try { const d = localStorage.getItem(`prioritize-ws-${wsId}-settings`); return d ? JSON.parse(d) : null; } catch { return null; }
};
export const removeWsSettings = (wsId) => {
  try { localStorage.removeItem(`prioritize-ws-${wsId}-settings`); } catch {}
};

// ─── Scenarios (guest mode) ─────────────────────────────────────────

export const saveWsScenarios = (wsId, scenarios) => {
  try { localStorage.setItem(`prioritize-ws-${wsId}-scenarios`, JSON.stringify(scenarios)); } catch {}
};
export const loadWsScenarios = (wsId) => {
  try { const d = localStorage.getItem(`prioritize-ws-${wsId}-scenarios`); return d ? JSON.parse(d) : []; } catch { return []; }
};
