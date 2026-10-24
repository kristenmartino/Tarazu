import relay from "../src/demo/relay.json";

// This reserved workspace never enters the guest index or account migration.
export const RELAY_DEMO_ID = "relay-demo-v1";
export const RELAY_DEMO_WORKSPACE = { id: RELAY_DEMO_ID, name: "Relay demo (fictional)" };
const prefix = `prioritize-ws-${RELAY_DEMO_ID}`;
const manifest = `${prefix}-seed`;
const initial = {
  [prefix]: { features: relay.features, manualOrder: relay.manualOrder },
  [`${prefix}-context`]: relay.context,
  [`${prefix}-signals`]: relay.signals,
  [`${prefix}-decisions`]: relay.decisions,
  [`${prefix}-briefs`]: relay.briefs,
  [`${prefix}-settings`]: { sortMode: "rice", viewMode: "list" },
  [`${prefix}-scenarios`]: [],
};

// Synchronous initialization cannot race with this page's autosave. A manifest
// is committed last; failures roll back only the demo's keys. Reset also uses
// the transaction, retaining the visitor's previous copy if a write fails.
export function prepareRelayDemo(storage, { reset = false } = {}) {
  const keys = [...Object.keys(initial), manifest];
  const previous = Object.fromEntries(keys.map(key => [key, storage.getItem(key)]));
  if (!reset && previous[manifest] === "1") {
    for (const key of Object.keys(initial)) {
      const value = JSON.parse(previous[key]);
      const valid = key === prefix ? Array.isArray(value?.features) && Array.isArray(value?.manualOrder)
        : Array.isArray(initial[key]) ? Array.isArray(value) : value && typeof value === "object" && !Array.isArray(value);
      if (!valid) throw new Error("The saved Relay demo could not be read. Restart the demo to restore the example.");
    }
    return;
  }
  if (!reset && keys.some(key => previous[key] !== null))
    throw new Error("The saved Relay demo is incomplete. Restart the demo to restore the example.");
  const written = [];
  try {
    for (const [key, value] of Object.entries(initial)) {
      storage.setItem(key, JSON.stringify(value));
      written.push(key);
    }
    storage.setItem(manifest, "1");
  } catch (error) {
    for (const key of written.reverse()) {
      try {
        if (previous[key] === null) storage.removeItem(key);
        else storage.setItem(key, previous[key]);
      } catch { /* The original storage failure must stay visible. */ }
    }
    throw error;
  }
}
