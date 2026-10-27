import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { useState } from "react";
const { auth, api, localSave, network } = vi.hoisted(() => ({
  auth: { isSignedIn: true, isLoaded: true, userId: "user", orgId: "org" },
  localSave: vi.fn(),
  network: { online: true },
  api: {
    createWorkspace: vi.fn(), resolveScoreEvents: vi.fn(), createSignal: vi.fn(), createDecision: vi.fn(), renameWorkspaceApi: vi.fn(), fetchWorkspaces: vi.fn(), fetchFeatures: vi.fn(), fetchProductContext: vi.fn(),
    fetchDecisions: vi.fn(), fetchSignals: vi.fn(), fetchWorkspaceSettings: vi.fn(),
    fetchFeedbackSummary: vi.fn(), fetchFeedbackContext: vi.fn(), upsertFeature: vi.fn(),
    syncFeatures: vi.fn(), saveProductContext: vi.fn(), saveWorkspaceSettings: vi.fn(), createDecisionReview: vi.fn(),
  },
}));
vi.mock("./hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("./hooks/useOnlineStatus", () => ({ useOnlineStatus: () => network.online }));
vi.mock("./hooks/useMedia", () => ({ useMedia: () => false }));
vi.mock("./ThemeProvider", () => ({ useC: () => new Proxy({}, { get: () => "#888" }) }));
vi.mock("../lib/cloud-storage", () => api);
vi.mock("../lib/local-storage", async importOriginal => ({ ...await importOriginal(), saveWsFeaturesChecked: localSave }));
vi.mock("./components/LeftRail", () => ({ LeftRail: () => null }));
vi.mock("./components/RightRail", () => ({ RightRail: ({ feedbackSummary }) => <aside><p>Feedback summary: {feedbackSummary?.scope || "None"}</p></aside> }));
vi.mock("./components/ThemeMenu", () => ({ ThemeMenu: () => null }));
vi.mock("./components/OrgSwitcher", () => ({ OrgSwitcher: () => null }));
vi.mock("./components/CenterCanvas", () => ({ CenterCanvas: function SaveHarness({ showForm, onShowForm, onAddFeature, features, onEditingFeature, saveTarget, savePendingSync, decisions, onReviewDecision, productContext, onProductContextChange, contextSaveStatus, onSwitchWorkspace, activeWsId, workspaces, onRenameWorkspace, onAddWorkspace, onAddSignal, onAddDecision, signals, onClear, onUndo, undoSnapshot, importData, onImportFile, onConfirmImport, dragId, onDragStart, feedbackContext, onResolveScores }) {
  const [error, setError] = useState("");
  const [name, setName] = useState("Draft candidate");
  return <main><p>Feedback context: {feedbackContext?.scope || "None"}</p><button onClick={() => onResolveScores("candidate", {})}>Refresh test feedback</button><p>Candidate names: {features.map(f => f.name).join(", ")}</p><button onClick={onClear}>Clear test candidates</button>{undoSnapshot && <button onClick={onUndo}>Undo test clear</button>}<button onClick={onImportFile}>Import test candidates</button>{importData && <><p>Import preview: {importData.features[0]?.name}</p><button onClick={onConfirmImport}>Confirm test import</button></>}<button onClick={() => onDragStart("source-candidate")}>Drag test candidate</button><p>Dragged candidate: {dragId || "None"}</p><button onClick={onAddWorkspace}>Create test workspace</button><button onClick={() => onAddSignal({ title: "Old signal draft" }).catch(e => setError(e.message))}>Create test signal</button><button onClick={() => onAddDecision({ title: "Old decision draft" }).catch(e => setError(e.message))}>Create test decision</button><p>Signal titles: {signals.map(s => s.title).join(", ")}</p><p>Decision titles: {decisions.map(d => d.title).join(", ")}</p><p>Workspace names: {workspaces.map(w => w.name).join(", ")}</p><button onClick={() => onRenameWorkspace(activeWsId, "Renamed old workspace")}>Rename context workspace</button><p>Active workspace: {activeWsId}</p><p>Constraints: {productContext?.constraints || "Not recorded"}</p><p>Frame question: {productContext?.scoring?.decisionQuestion || "Not recorded"}</p><button onClick={() => onProductContextChange({ ...productContext, scoring: { ...productContext?.scoring, decisionQuestion: "Test draft question" } })}>Change context</button><button onClick={() => onSwitchWorkspace("other")}>Switch context workspace</button>{contextSaveStatus?.message && <p role={contextSaveStatus.state === "error" ? "alert" : "status"}>{contextSaveStatus.message}</p>}<button onClick={() => onReviewDecision("decision", {action:"keep",outcome:"Unknown",next_action:"Collect evidence",signal_ids:[]}).catch(e=>setError(e.message))}>Save test review</button><p>{decisions.reduce((n,d)=>n+(d.reviews?.length || 0),0)} reviews saved</p><p>Save target: {saveTarget}{savePendingSync ? " · pending sync" : ""}</p><input aria-label="Draft name" value={name} onChange={e => setName(e.target.value)} /><button onClick={() => onShowForm(true)}>Edit draft</button><button onClick={() => { onEditingFeature({ id: "second", name: "Another candidate" }); onShowForm(true); }}>Edit another candidate</button>{showForm && <><p>Editor draft retained</p><button onClick={() => onAddFeature({ id: "candidate", name, reach: 55, impact: 55, confidence: 20, effort: 35 }).catch(e => setError(e.message))}>Save candidate</button></>}{error && <p role="alert">{error}</p>}<p>{features.length} candidates saved</p></main>;
} }));
import App from "./App";
import { saveWsIndex, saveWsFeatures, saveWsDecisions, saveWsContext, loadWsContext } from "../lib/local-storage";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  auth.orgId = "org"; auth.isSignedIn = true; network.online = true;
  api.fetchWorkspaces.mockResolvedValue([{ id: "workspace", name: "Workspace" }]);
  api.fetchFeatures.mockResolvedValue({ features: [], manualOrder: [] });
  api.fetchProductContext.mockResolvedValue({});
  api.fetchDecisions.mockResolvedValue({ decisions: [] }); api.fetchSignals.mockResolvedValue({ signals: [] });
  api.fetchWorkspaceSettings.mockResolvedValue({}); api.fetchFeedbackSummary.mockResolvedValue(null); api.fetchFeedbackContext.mockResolvedValue(null);
  api.saveProductContext.mockReset().mockResolvedValue(undefined); api.saveWorkspaceSettings.mockResolvedValue(undefined);
  api.syncFeatures.mockResolvedValue({}); localSave.mockImplementation(() => {});
});
afterEach(cleanup);
const save = async () => { fireEvent.click(await screen.findByRole("button", { name: "Edit draft" })); fireEvent.click(screen.getByRole("button", { name: "Save candidate" })); };
describe("explicit candidate save acknowledgement", () => {
  it("keeps the editor until cloud persistence completes, then acknowledges cloud save", async () => {
    let finish;
    api.upsertFeature.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    render(<App />); await save();
    await waitFor(() => expect(api.upsertFeature).toHaveBeenCalledWith("workspace", expect.objectContaining({ name: "Draft candidate" })));
    expect(screen.getByText("Editor draft retained")).toBeTruthy();
    expect(screen.getByText("0 candidates saved")).toBeTruthy();
    finish({ id: "candidate" });
    expect(await screen.findByText("Saved to cloud")).toBeTruthy();
    expect(screen.queryByText("Editor draft retained")).toBeNull();
    expect(localSave).not.toHaveBeenCalled();
  });
  it("retains the editor and exposes failure when neither cloud nor browser storage succeeds", async () => {
    api.upsertFeature.mockRejectedValue(new Error("Unavailable"));
    localSave.mockImplementation(() => { throw new Error("Browser storage is full"); });
    render(<App />); await save();
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Browser storage is full");
    expect(screen.getByText("Editor draft retained")).toBeTruthy();
    expect(screen.getByText("0 candidates saved")).toBeTruthy();
    expect(screen.queryByText("Saved to cloud")).toBeNull();
  });
  it("acknowledges durable browser fallback as pending sync rather than cloud success", async () => {
    api.upsertFeature.mockRejectedValue(new Error("Unavailable"));
    render(<App />); await save();
    expect(await screen.findByText("Saved in this browser · pending sync")).toBeTruthy();
    expect(localSave).toHaveBeenCalledWith("workspace", [expect.objectContaining({ name: "Draft candidate" })], []);
    expect(screen.queryByText("Editor draft retained")).toBeNull();
    expect(screen.queryByText("Saved to cloud")).toBeNull();
  });
  it("does not inject an old organization's completed save into the new workspace", async () => {
    let finish;
    api.upsertFeature.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const { rerender } = render(<App />); await save();
    await waitFor(() => expect(api.upsertFeature).toHaveBeenCalledOnce());
    auth.orgId = "other-org"; rerender(<App />);
    await waitFor(() => expect(api.fetchWorkspaces).toHaveBeenCalledTimes(2));
    finish({ id: "candidate" });
    await waitFor(() => expect(screen.getByText("0 candidates saved")).toBeTruthy());
    expect(screen.queryByText("Saved to cloud")).toBeNull();
  });
});


it("finishes an existing background feature write before the explicit candidate write", async () => {
  let finishBackground;
  api.syncFeatures.mockImplementationOnce(() => new Promise(resolve => { finishBackground = resolve; }));
  api.upsertFeature.mockResolvedValue({ id: "candidate" });
  render(<App />);
  await waitFor(() => expect(api.syncFeatures).toHaveBeenCalledOnce(), { timeout: 2500 });
  await save();
  expect(api.upsertFeature).not.toHaveBeenCalled();
  expect(screen.getByText("Editor draft retained")).toBeTruthy();
  finishBackground({});
  expect(await screen.findByText("Saved to cloud")).toBeTruthy();
  expect(api.upsertFeature).toHaveBeenCalledOnce();
});


it("keeps a newer editor open when an earlier candidate save completes in the same workspace", async () => {
  let finish;
  api.upsertFeature.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  render(<App />); await save();
  await waitFor(() => expect(api.upsertFeature).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Edit another candidate" }));
  finish({ id: "candidate" });
  expect(await screen.findByText("Saved to cloud")).toBeTruthy();
  expect(screen.getByText("1 candidates saved")).toBeTruthy();
  expect(screen.getByText("Editor draft retained")).toBeTruthy();
});


it("skips a reconnect snapshot queued during an explicit save and retries with the saved candidate", async () => {
  let finishOldSync, finishExplicit;
  api.upsertFeature.mockRejectedValueOnce(new Error("Offline service"))
    .mockImplementationOnce(() => new Promise(resolve => { finishExplicit = resolve; }));
  api.syncFeatures.mockImplementationOnce(() => new Promise(resolve => { finishOldSync = resolve; }))
    .mockResolvedValue({});
  const { rerender } = render(<App />);
  await save();
  await waitFor(() => expect(api.syncFeatures).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByRole("button", { name: "Edit draft" }));
  fireEvent.change(screen.getByLabelText("Draft name"), { target: { value: "Revised candidate" } });
  fireEvent.click(screen.getByRole("button", { name: "Save candidate" }));
  // A reconnect arrives after the explicit save started, carrying the old state.
  network.online = false; rerender(<App />);
  network.online = true; rerender(<App />);
  finishOldSync({});
  await waitFor(() => expect(api.upsertFeature).toHaveBeenCalledTimes(2));
  expect(api.syncFeatures).toHaveBeenCalledOnce();
  finishExplicit({ id: "candidate" });
  await waitFor(() => expect(api.syncFeatures).toHaveBeenCalledTimes(2));
  expect(api.syncFeatures.mock.calls[0][1][0].name).toBe("Draft candidate");
  expect(api.syncFeatures.mock.calls[1][1][0].name).toBe("Revised candidate");
  expect(api.syncFeatures.mock.calls.slice(1).every(call => call[1][0].name === "Revised candidate")).toBe(true);
  expect(await screen.findByText("Changes synced to cloud")).toBeTruthy();
});


it("labels signed-in cloud-load fallback as browser data without promoting it to a cloud sync", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  saveWsIndex([{id:"browser-workspace",name:"Browser fallback"}]);
  saveWsFeatures("browser-workspace", [{id:"candidate",name:"Browser draft",reach:55,impact:55,confidence:20,effort:35}], []);
  api.fetchFeatures.mockRejectedValueOnce(new Error("Cloud unavailable"));
  render(<App />);
  expect(await screen.findByText("1 candidates saved")).toBeTruthy();
  expect(screen.getByText("Save target: browser")).toBeTruthy();
  await new Promise(resolve => setTimeout(resolve, 1100));
  expect(api.syncFeatures).not.toHaveBeenCalled();
  expect(api.saveProductContext).not.toHaveBeenCalled();
  expect(api.saveWorkspaceSettings).not.toHaveBeenCalled();
  await save();
  expect(await screen.findByText("Saved in this browser")).toBeTruthy();
  expect(screen.queryByText("Save target: browser · pending sync")).toBeNull();
  expect(api.upsertFeature).not.toHaveBeenCalled();
  log.mockRestore();
});


it("forces the public demo into its isolated browser workspace even with a signed-in parent context", async () => {
  localStorage.setItem("prioritize-active-workspace", "own-workspace");
  render(<App guestDemo />);
  expect(await screen.findByText("3 candidates saved")).toBeTruthy();
  expect(screen.getByText("Save target: browser")).toBeTruthy();
  expect(localStorage.getItem("prioritize-active-workspace")).toBe("own-workspace");
  expect(localStorage.getItem("prioritize-workspaces")).toBeNull();
  for (const call of Object.values(api)) expect(call).not.toHaveBeenCalled();
});


it("starts a blank decision in the signed-in workspace without replacing existing candidates", async () => {
  window.history.replaceState(null,"","/app?start=decision");
  api.fetchFeatures.mockResolvedValue({features:[{id:"existing",name:"Keep existing work",reach:55,impact:55,confidence:20,effort:35}],manualOrder:[]});
  try {
    render(<App />);
    expect(await screen.findByText("Editor draft retained")).toBeTruthy();
    expect(screen.getByText("1 candidates saved")).toBeTruthy();
    expect(screen.getByRole("region",{name:"Your own decision"}).textContent).toContain("New candidate in Workspace");
    expect(api.upsertFeature).not.toHaveBeenCalled();
    expect(api.createWorkspace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  } finally { cleanup(); window.history.replaceState(null,"","/"); }
});


it("keeps a failed cloud review out of the saved record and retains the original", async () => {
  const original={id:"decision",title:"Original",final_rationale:"Do not overwrite"};
  api.fetchDecisions.mockResolvedValue({decisions:[original]});
  api.createDecisionReview.mockRejectedValue(new Error("Review service unavailable"));
  render(<App />); fireEvent.click(await screen.findByRole("button",{name:"Save test review"}));
  expect(await screen.findByRole("alert")).toHaveProperty("textContent","Review service unavailable");
  expect(screen.getByText("0 reviews saved")).toBeTruthy();expect(original.final_rationale).toBe("Do not overwrite");
});
it("does not inject a completed review from another organization into the active workspace", async () => {
  let finish;api.fetchDecisions.mockResolvedValue({decisions:[{id:"decision",title:"Original"}]});
  api.createDecisionReview.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const {rerender}=render(<App />);fireEvent.click(await screen.findByRole("button",{name:"Save test review"}));
  await waitFor(()=>expect(api.createDecisionReview).toHaveBeenCalledOnce());
  auth.orgId="other-org";rerender(<App />);await waitFor(()=>expect(api.fetchWorkspaces).toHaveBeenCalledTimes(2));
  finish({id:"r",action:"keep"});await waitFor(()=>expect(screen.getByText("0 reviews saved")).toBeTruthy());
});

it("does not acknowledge a guest review when browser storage is full", async () => {
  auth.isSignedIn=false;saveWsIndex([{id:"workspace",name:"Browser"}]);saveWsFeatures("workspace",[]);saveWsDecisions("workspace",[{id:"decision",title:"Original"}]);
  render(<App />);const button=await screen.findByRole("button",{name:"Save test review"});
  const stored=localStorage.getItem("prioritize-ws-workspace-decisions");
  const write=vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw new Error("Storage full");});
  try { fireEvent.click(button);expect(await screen.findByRole("alert")).toHaveProperty("textContent","Storage full");expect(screen.getByText("0 reviews saved")).toBeTruthy();expect(localStorage.getItem("prioritize-ws-workspace-decisions")).toBe(stored); }
  finally { write.mockRestore(); }
});


describe("checked shared-frame persistence", () => {
  it("retains a guest frame after quota failure, reports it, and acknowledges only a successful retry", async () => {
    auth.isSignedIn = false;
    saveWsIndex([{ id: "workspace", name: "Browser" }]);
    localStorage.setItem("prioritize-active-workspace", "workspace");
    saveWsFeatures("workspace", []);
    saveWsContext("workspace", { constraints: "Keep unrelated context", scoring: { decisionQuestion: "Durable question" } });
    render(<App />);
    await screen.findByText("Frame question: Durable question");
    const realWrite = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(key, value) {
      if (key.endsWith("-context")) throw new Error("Quota");
      return realWrite.call(this, key, value);
    });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Change context" }));
      expect(await screen.findByRole("alert")).toHaveProperty("textContent", expect.stringContaining("Context could not be saved"));
      expect(screen.getByText("Frame question: Test draft question")).toBeTruthy();
      expect(loadWsContext("workspace").scoring.decisionQuestion).toBe("Durable question");
      expect(screen.queryByText("Context saved in this browser.")).toBeNull();
    } finally { write.mockRestore(); }
    fireEvent.click(screen.getByRole("button", { name: "Change context" }));
    expect(await screen.findByText("Context saved in this browser.")).toBeTruthy();
    expect(loadWsContext("workspace")).toMatchObject({ constraints: "Keep unrelated context", scoring: { decisionQuestion: "Test draft question" } });
  });

  it("reports failed cloud and browser context writes without acknowledging durability", async () => {
    api.saveProductContext.mockRejectedValue(new Error("Cloud unavailable"));
    render(<App />);
    await screen.findByRole("button", { name: "Change context" });
    const realWrite = Storage.prototype.setItem;
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function(key, value) {
      if (key.endsWith("-context")) throw new Error("Quota");
      return realWrite.call(this, key, value);
    });
    try {
      fireEvent.click(screen.getByRole("button", { name: "Change context" }));
      const error = await screen.findByRole("alert", {}, { timeout: 2500 });
      expect(error.textContent).toContain("Context could not be saved");
      expect(screen.queryByText("Context saved to this workspace.")).toBeNull();
      expect(screen.queryByText("Context saved in this browser; cloud sync is pending.")).toBeNull();
      expect(screen.getByText("Frame question: Test draft question")).toBeTruthy();
    } finally { write.mockRestore(); }
  });

  it("keeps a completed old-workspace context request from acknowledging the new workspace", async () => {
    let finishOld;
    api.fetchWorkspaces.mockResolvedValue([{ id: "workspace", name: "First" }, { id: "other", name: "Second" }]);
    api.fetchProductContext.mockImplementation(async id => ({ scoring: { decisionQuestion: id === "other" ? "Second workspace question" : "First workspace question" } }));
    api.saveProductContext.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockImplementation(id => id === "other" ? new Promise(() => {}) : Promise.resolve());
    render(<App />);
    await screen.findByText("Frame question: First workspace question");
    fireEvent.click(screen.getByRole("button", { name: "Change context" }));
    await waitFor(() => expect(api.saveProductContext).toHaveBeenCalledWith("workspace", expect.objectContaining({ scoring: expect.objectContaining({ decisionQuestion: "Test draft question" }) })), { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
    expect(screen.getByText("Frame question: Test draft question")).toBeTruthy();
    await act(async () => finishOld());
    await screen.findByText("Frame question: Second workspace question");
    expect(screen.getByText("Saving workspace context…")).toBeTruthy();
    expect(screen.queryByText("Context saved to this workspace.")).toBeNull();
    expect(screen.getByText("Frame question: Second workspace question")).toBeTruthy();
  });
});


// Mocked cloud integration: these exercise App's scope boundaries, not a live Clerk session.
describe("workspace context load integrity", () => {
  it("fails closed on a new team's context read and retries without copying the previous team's context", async () => {
    api.fetchProductContext.mockResolvedValueOnce({ constraints: "A private note", scoring: { decisionQuestion: "Team A" } })
      .mockRejectedValueOnce(new Error("Context unavailable"))
      .mockResolvedValue({ constraints: "B private note", scoring: { decisionQuestion: "Team B" } });
    const { rerender } = render(<App />);
    await screen.findByText("Frame question: Team A");
    api.fetchWorkspaces.mockResolvedValue([{ id: "team-b", name: "Team B" }]);
    auth.orgId = "team-b"; rerender(<App />);
    expect(await screen.findByRole("button", { name: "Retry workspace load" })).toBeTruthy();
    expect(screen.queryByText("Constraints: A private note")).toBeNull();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    expect(api.saveProductContext.mock.calls.some(([id]) => id === "team-b")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Retry workspace load" }));
    await screen.findByText("Frame question: Team B");
    expect(screen.getByText("Constraints: B private note")).toBeTruthy();
  });

  it("keeps the previous coherent workspace when the target context read fails", async () => {
    api.fetchProductContext.mockImplementation(id => id === "other" ? Promise.reject(new Error("Unavailable")) : Promise.resolve({ constraints: "Keep A constraints", scoring: { decisionQuestion: "Keep A" } }));
    render(<App />); await screen.findByText("Frame question: Keep A");
    fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
    await screen.findByText(/Could not load the selected workspace/);
    expect(screen.getByText("Active workspace: workspace")).toBeTruthy();
    expect(screen.getByText("Constraints: Keep A constraints")).toBeTruthy();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    expect(api.saveProductContext.mock.calls.some(([id]) => id === "other")).toBe(false);
    expect(localStorage.getItem("tarazu-cloud-workspace:user:org")).toBeNull();
  });

  it("ignores an old pending workspace switch after the active team changes", async () => {
    let finishOld;
    api.fetchProductContext.mockImplementation(id => id === "other" ? new Promise(resolve => { finishOld = resolve; }) : Promise.resolve({ scoring: { decisionQuestion: id } }));
    const { rerender } = render(<App />); await screen.findByText("Frame question: workspace");
    fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
    await waitFor(() => expect(finishOld).toBeTypeOf("function"));
    api.fetchWorkspaces.mockResolvedValue([{ id: "team-c", name: "Team C" }]);
    auth.orgId = "team-c"; rerender(<App />);
    await screen.findByText("Frame question: team-c");
    await act(async () => finishOld({ constraints: "Old team secret", scoring: { decisionQuestion: "Old B" } }));
    expect(screen.getByText("Active workspace: team-c")).toBeTruthy();
    expect(screen.queryByText("Constraints: Old team secret")).toBeNull();
    expect(localStorage.getItem("tarazu-cloud-workspace:user:org")).toBeNull();
  });

  it("clears previous cloud context when entering an empty browser workspace", async () => {
    api.fetchProductContext.mockResolvedValue({ constraints: "Cloud private note", scoring: { decisionQuestion: "Cloud question" } });
    const { rerender } = render(<App />); await screen.findByText("Frame question: Cloud question");
    saveWsIndex([{ id: "empty-browser", name: "Empty browser" }]); saveWsFeatures("empty-browser", []);
    localStorage.setItem("prioritize-active-workspace", "empty-browser");
    auth.isSignedIn = false; rerender(<App />);
    await screen.findByText("Active workspace: empty-browser");
    expect(screen.getByText("Constraints: Not recorded")).toBeTruthy();
    expect(screen.getByText("Frame question: Not recorded")).toBeTruthy();
    expect(loadWsContext("empty-browser")?.constraints).not.toBe("Cloud private note");
  });

  it("serializes in-flight context writes so an older edit cannot overwrite a newer edit", async () => {
    let finishOld;
    api.saveProductContext.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValue(undefined);
    render(<App />); await screen.findByRole("button", { name: "Change context" });
    await waitFor(() => expect(api.saveProductContext).toHaveBeenCalledOnce(), { timeout: 2500 });
    fireEvent.click(screen.getByRole("button", { name: "Change context" }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1100)); });
    expect(api.saveProductContext).toHaveBeenCalledOnce();
    await act(async () => finishOld());
    await waitFor(() => expect(api.saveProductContext).toHaveBeenCalledTimes(2));
    expect(api.saveProductContext.mock.calls[1][1].scoring.decisionQuestion).toBe("Test draft question");
  });
});


it("does not restore an old team's workspace list when a delayed rename finishes", async () => {
  let finishRename;
  api.renameWorkspaceApi.mockImplementation(() => new Promise(resolve => { finishRename = resolve; }));
  const { rerender } = render(<App />); await screen.findByText("Workspace names: Workspace");
  fireEvent.click(screen.getByRole("button", { name: "Rename context workspace" }));
  await waitFor(() => expect(finishRename).toBeTypeOf("function"));
  api.fetchWorkspaces.mockResolvedValue([{ id: "team-b", name: "Team B workspace" }]);
  auth.orgId = "team-b"; rerender(<App />);
  await screen.findByText("Workspace names: Team B workspace");
  await act(async () => finishRename());
  expect(screen.getByText("Workspace names: Team B workspace")).toBeTruthy();
  expect(screen.queryByText(/Workspace names: Renamed old workspace/)).toBeNull();
});


it("makes workspace content inert while a switch is pending and rejects late context edits", async () => {
  let finish;
  api.fetchProductContext.mockImplementation(id => id === "other" ? new Promise(resolve => { finish = resolve; }) : Promise.resolve({ scoring: { decisionQuestion: "Original question" } }));
  render(<App />); await screen.findByText("Frame question: Original question");
  fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  expect(screen.getByRole("button", { name: "Change context" }).closest("[inert]")).toBeTruthy();
  // jsdom does not implement native inert; the callback also rejects stale work.
  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  expect(screen.getByText("Frame question: Original question")).toBeTruthy();
  await act(async () => finish({ scoring: { decisionQuestion: "Target question" } }));
  expect(screen.getByText("Frame question: Target question")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Change context" }).closest("[inert]")).toBeNull();
});


it("flushes an immediate frame edit before switching and the edit survives a later reload", async () => {
  let finishSave;
  const contexts = { workspace: { constraints: "Keep constraints", scoring: { decisionQuestion: "Before" } }, other: { scoring: { decisionQuestion: "Other" } } };
  api.fetchProductContext.mockImplementation(async id => contexts[id]);
  api.saveProductContext.mockImplementationOnce((id, context) => new Promise(resolve => { finishSave = () => { contexts[id] = context; resolve(); }; })).mockImplementation(async (id, context) => { contexts[id] = context; });
  render(<App />); await screen.findByText("Frame question: Before");
  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
  await waitFor(() => expect(finishSave).toBeTypeOf("function"));
  expect(api.fetchProductContext.mock.calls.map(([id]) => id)).toEqual(["workspace"]);
  expect(screen.getByText("Frame question: Test draft question")).toBeTruthy();
  await act(async () => finishSave());
  await screen.findByText("Frame question: Other");
  expect(contexts.workspace).toMatchObject({ constraints: "Keep constraints", scoring: { decisionQuestion: "Test draft question" } });
  cleanup(); localStorage.setItem("tarazu-cloud-workspace:user:org", "workspace");
  render(<App />); await screen.findByText("Frame question: Test draft question");
  expect(screen.getByText("Constraints: Keep constraints")).toBeTruthy();
});

it("keeps unsaved context open if the departure flush fails instead of opening another workspace", async () => {
  api.saveProductContext.mockRejectedValueOnce(new Error("Unavailable"));
  render(<App />); await screen.findByRole("button", { name: "Change context" });
  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
  await screen.findByText(/Could not load the selected workspace or finish saving/);
  expect(screen.getByText("Active workspace: workspace")).toBeTruthy();
  expect(screen.getByText("Frame question: Test draft question")).toBeTruthy();
  expect(api.fetchProductContext.mock.calls.map(([id]) => id)).toEqual(["workspace"]);
  expect(screen.queryByText("Context saved to this workspace.")).toBeNull();
});


for (const type of ["signal", "decision"]) it(`ignores a late ${type} create completion after a team change`, async () => {
  let finish;
  const apiCall = type === "signal" ? api.createSignal : api.createDecision;
  apiCall.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(<App />); await screen.findByText("Workspace names: Workspace");
  fireEvent.click(screen.getByRole("button", { name: `Create test ${type}` }));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  expect(apiCall.mock.calls[0][0]).toBe("workspace");
  api.fetchWorkspaces.mockResolvedValue([{ id: "team-b", name: "Team B workspace" }]);
  auth.orgId = "team-b"; rerender(<App />); await screen.findByText("Workspace names: Team B workspace");
  await act(async () => finish({ id: "old-record", title: `Old ${type} draft` }));
  expect(screen.queryByText(new RegExp(`titles: Old ${type} draft`))).toBeNull();
  expect(screen.getByText("Active workspace: team-b")).toBeTruthy();
});

it("ignores a late workspace create completion after a team change", async () => {
  let finish;
  api.createWorkspace.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const { rerender } = render(<App />); await screen.findByText("Workspace names: Workspace");
  fireEvent.click(screen.getByRole("button", { name: "Create test workspace" }));
  fireEvent.change(await screen.findByRole("textbox", { name: "Workspace name" }), { target: { value: "Old team new workspace" } });
  fireEvent.click(screen.getByRole("button", { name: "Create", exact: true }));
  await waitFor(() => expect(finish).toBeTypeOf("function"));
  api.fetchWorkspaces.mockResolvedValue([{ id: "team-b", name: "Team B workspace" }]);
  auth.orgId = "team-b"; rerender(<App />); await screen.findByText("Workspace names: Team B workspace");
  await act(async () => finish({ id: "old-created", name: "Old team new workspace" }));
  expect(screen.getByText("Workspace names: Team B workspace")).toBeTruthy();
  expect(api.fetchFeatures.mock.calls.some(([id]) => id === "old-created")).toBe(false);
  expect(localStorage.getItem("tarazu-cloud-workspace:user:org")).toBeNull();
});


it("departs with the latest context when a workspace create callback predates a frame edit", async () => {
  let finishCreate;
  api.fetchProductContext.mockResolvedValue({ constraints: "Preserve source", scoring: { decisionQuestion: "Before creation" } });
  api.createWorkspace.mockImplementation(() => new Promise(resolve => { finishCreate = resolve; }));
  render(<App />); await screen.findByText("Frame question: Before creation");
  await screen.findByText("Context saved to this workspace.", {}, { timeout: 2500 });
  api.saveProductContext.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Create test workspace" }));
  fireEvent.change(await screen.findByRole("textbox", { name: "Workspace name" }), { target: { value: "Fictional created workspace" } });
  fireEvent.click(screen.getByRole("button", { name: "Create", exact: true }));
  await waitFor(() => expect(finishCreate).toBeTypeOf("function"));
  fireEvent.click(screen.getByRole("button", { name: "Change context" }));
  await act(async () => finishCreate({ id: "created", name: "Fictional created workspace" }));
  await screen.findByText("Active workspace: created");
  expect(api.saveProductContext).toHaveBeenCalledWith("workspace", expect.objectContaining({ constraints: "Preserve source", scoring: { decisionQuestion: "Test draft question" } }));
  expect(api.saveProductContext.mock.invocationCallOrder[0]).toBeLessThan(api.fetchFeatures.mock.invocationCallOrder.at(-1));
});


for (const boundary of ["workspace", "organization"]) it(`clears Undo, import preview and drag state after a successful ${boundary} change`, async () => {
  api.fetchFeatures.mockImplementation(async id => ({ features: [{ id: `${id}-candidate`, name: `${id} candidate` }], manualOrder: [] }));
  const { rerender, container } = render(<App />); await screen.findByText("Candidate names: workspace candidate");
  fireEvent.click(screen.getByRole("button", { name: "Clear test candidates" }));
  expect(screen.getByRole("button", { name: "Undo test clear" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Drag test candidate" }));
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(["name,reach,impact,confidence,effort\nImported A,55,55,20,35"], "fictional.csv", { type: "text/csv" })] } });
  await screen.findByText("Import preview: Imported A");
  if (boundary === "workspace") fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
  else { api.fetchWorkspaces.mockResolvedValue([{ id: "other", name: "Other team workspace" }]); auth.orgId = "other-team"; rerender(<App />); }
  await screen.findByText("Active workspace: other");
  expect(screen.getByText("Candidate names: other candidate")).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Undo test clear" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Confirm test import" })).toBeNull();
  expect(screen.queryByText("Import preview: Imported A")).toBeNull();
  expect(screen.getByText("Dragged candidate: None")).toBeTruthy();
});


it("ignores a file read completed after leaving its source workspace", async () => {
  let finishRead;
  const OriginalReader = globalThis.FileReader;
  globalThis.FileReader = class { readAsText() { finishRead = () => this.onload({ target: { result: "name,reach,impact,confidence,effort\nLate source import,55,55,20,35" } }); } };
  try {
    const { container } = render(<App />); await screen.findByText("Active workspace: workspace");
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [new File(["unused until callback"], "fictional.csv", { type: "text/csv" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Switch context workspace" }));
    await screen.findByText("Active workspace: other");
    await act(async () => finishRead());
    expect(screen.queryByText("Import preview: Late source import")).toBeNull();
    expect(screen.queryByRole("button", { name: "Confirm test import" })).toBeNull();
    expect(screen.getByText("0 candidates saved")).toBeTruthy();
  } finally { globalThis.FileReader = OriginalReader; }
});


for (const operation of ["load", "refresh"]) it(`ignores old-team feedback ${operation} responses after the current team metadata loads`, async () => {
  let finishSummary, finishContext;
  api.fetchFeedbackSummary.mockImplementation(id => id === "team-b" ? Promise.resolve({ scope: "Team B" }) : new Promise(resolve => { finishSummary = resolve; }));
  api.fetchFeedbackContext.mockImplementation(id => id === "team-b" ? Promise.resolve({ scope: "Team B" }) : new Promise(resolve => { finishContext = resolve; }));
  if (operation === "refresh") {
    api.fetchFeedbackSummary.mockResolvedValueOnce({ scope: "Team A initial" });
    api.fetchFeedbackContext.mockResolvedValueOnce({ scope: "Team A initial" });
  }
  const { rerender } = render(<App />); await screen.findByText("Active workspace: workspace");
  if (operation === "refresh") { await screen.findByText("Feedback context: Team A initial"); fireEvent.click(screen.getByRole("button", { name: "Refresh test feedback" })); }
  await waitFor(() => expect(finishContext).toBeTypeOf("function"));
  api.fetchWorkspaces.mockResolvedValue([{ id: "team-b", name: "Team B" }]);
  auth.orgId = "team-b"; rerender(<App />);
  await screen.findByText("Feedback context: Team B"); await screen.findByText("Feedback summary: Team B");
  await act(async () => { finishSummary({ scope: "Old team secret" }); finishContext({ scope: "Old team secret" }); });
  expect(screen.getByText("Feedback context: Team B")).toBeTruthy();
  expect(screen.getByText("Feedback summary: Team B")).toBeTruthy();
  expect(screen.queryByText(/Old team secret/)).toBeNull();
});
