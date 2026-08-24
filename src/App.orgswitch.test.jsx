import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

// The one behavior this file exists to pin: switching organizations must
// refetch the workspace list.
//
// /api/workspaces scopes its result to the caller's active org, so the answer
// changes when the org does. App's init effect keyed only on
// [authLoaded, isSignedIn] until #117, so it never re-ran and the user kept
// looking at the previous org's backlog. The switcher's afterSelect*Url props
// do NOT cover this — they navigate to /app, the route already mounted, so
// Next soft-navigates without remounting.
//
// #117 shipped the fix with no test that could catch its removal: deleting
// orgId from the dependency array passed the entire suite. This closes that.

const auth = { isSignedIn: true, isLoaded: true, userId: "user_1", orgId: "org_a" };

vi.mock("./hooks/useAuth", () => ({ useAuth: () => auth }));

// Every colour token resolves to the same grey; this test asserts behavior,
// not appearance. The palette is built inside the factory rather than closed
// over from module scope: `import App` is hoisted above any const here, so a
// module-scope palette is still in its temporal dead zone when the mock runs.
vi.mock("./ThemeProvider", () => ({
  useC: () => new Proxy({}, { get: () => "#888" }),
  // ThemeMenu destructures C off useTheme(), not useC() — omitting it here
  // renders the palette undefined and crashes the whole tree.
  useTheme: () => ({ C: new Proxy({}, { get: () => "#888" }), themeName: "onyx", setThemeName: () => {}, themes: [] }),
}));

// Renders to <canvas>, which jsdom does not implement.
vi.mock("./components/Matrix", () => ({ Matrix: () => null }));

const { cloudMock } = vi.hoisted(() => ({
  cloudMock: {
    fetchWorkspaces: vi.fn(async () => [{ id: "ws1", name: "Backlog" }]),
    fetchFeatures: vi.fn(async () => ({ features: [], manualOrder: [] })),
    fetchProductContext: vi.fn(async () => ({})),
    fetchDecisions: vi.fn(async () => ({ decisions: [] })),
    fetchSignals: vi.fn(async () => ({ signals: [] })),
    fetchWorkspaceSettings: vi.fn(async () => null),
    fetchFeedbackSummary: vi.fn(async () => null),
    fetchFeedbackContext: vi.fn(async () => null),
    createWorkspace: vi.fn(async () => ({ id: "ws1", name: "Backlog" })),
    createDecision: vi.fn(), createSignal: vi.fn(), importSignals: vi.fn(),
    deleteDecisionApi: vi.fn(), deleteFeatureApi: vi.fn(), deleteSignalApi: vi.fn(),
    deleteWorkspaceApi: vi.fn(), renameWorkspaceApi: vi.fn(),
    postAnalysisEvent: vi.fn(), postScoreEvents: vi.fn(), resolveScoreEvents: vi.fn(),
    syncFeatures: vi.fn(), saveProductContext: vi.fn(), saveWorkspaceSettings: vi.fn(),
    updateDecisionApi: vi.fn(), updateSignalApi: vi.fn(),
  },
}));

vi.mock("../lib/cloud-storage", () => cloudMock);
vi.mock("../lib/feedback-storage", () => ({
  loadAnalysisEvents: () => [],
  loadScoreEvents: () => [],
  resolveScoreEvents: () => {},
  saveAnalysisEvent: () => {},
  saveScoreEvent: () => {},
  updateAnalysisEvent: () => {},
}));
vi.mock("../lib/feedback-context", () => ({
  computeSummaryMetrics: () => null,
  buildScoreCalibration: () => null,
  buildAnalysisContext: () => null,
}));
vi.mock("../lib/local-storage", () => ({
  STORAGE_KEY: "tz",
  // The real collection loaders return [] on both success and failure — never
  // null (lib/local-storage.js). Mocking null here produced a "signals is not
  // iterable" crash that exists nowhere in production, i.e. the mock was
  // testing a state the app can't reach.
  load: () => null,
  loadWsIndex: () => null,
  // Object-or-null: App reads `.features` off the result, so [] would surface
  // as undefined and crash useScored.
  loadWsFeatures: () => null,
  loadWsContext: () => null,
  // Array-always: these are passed straight into state and iterated, so null
  // would crash where production never can.
  loadWsDecisions: () => [],
  loadWsSignals: () => [],
  loadWsSettings: () => null,
  getActiveWsId: () => null,
  setActiveWsId: () => {},
  saveWsIndex: () => {},
  saveWsFeatures: () => {},
  saveWsContext: () => {},
  saveWsDecisions: () => {},
  saveWsSignals: () => {},
  saveWsSettings: () => {},
  removeWsFeatures: () => {},
  removeWsContext: () => {},
  removeWsDecisions: () => {},
  removeWsSignals: () => {},
  removeWsSettings: () => {},
}));

import App from "./App";

// jsdom implements neither of these, and App reaches for both on mount:
// useMedia() calls matchMedia for its responsive breakpoints, and the
// scroll/observer APIs are touched by reveal animations in child components.
beforeEach(() => {
  window.matchMedia = window.matchMedia || ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }));
  window.IntersectionObserver = window.IntersectionObserver || class {
    observe() {} unobserve() {} disconnect() {}
  };
  window.scrollTo = window.scrollTo || (() => {});
});

beforeEach(() => {
  vi.clearAllMocks();
  auth.orgId = "org_a";
  auth.isSignedIn = true;
  auth.isLoaded = true;
});

describe("App — organization switching", () => {
  it("refetches workspaces when the active org changes, and not when it doesn't", async () => {
    const { rerender } = render(<App />);
    await waitFor(() => expect(cloudMock.fetchWorkspaces).toHaveBeenCalledTimes(1));

    // The control, checked BEFORE the positive case so a test that refetches on
    // every render fails here rather than passing the assertion that follows.
    // Without it, "called twice after switching" would also pass for an effect
    // with no dependency array at all.
    auth.orgId = "org_a";
    rerender(<App />);
    await new Promise((r) => setTimeout(r, 20));
    expect(cloudMock.fetchWorkspaces).toHaveBeenCalledTimes(1);

    // The real assertion: a different org must reload the list.
    auth.orgId = "org_b";
    rerender(<App />);
    await waitFor(() => expect(cloudMock.fetchWorkspaces).toHaveBeenCalledTimes(2));
  });

  it("does not fetch from the cloud at all for a signed-out visitor", async () => {
    // Guests read localStorage; reaching the API here would mean the effect
    // ignores isSignedIn.
    auth.isSignedIn = false;
    auth.orgId = null;

    render(<App />);
    await new Promise((r) => setTimeout(r, 20));

    expect(cloudMock.fetchWorkspaces).not.toHaveBeenCalled();
  });
});
