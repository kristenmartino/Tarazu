import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, screen, fireEvent, cleanup } from "@testing-library/react";
import { useState } from "react";
const { auth, api, localSave, network } = vi.hoisted(() => ({
  auth: { isSignedIn: true, isLoaded: true, userId: "user", orgId: "org" },
  localSave: vi.fn(),
  network: { online: true },
  api: {
    fetchWorkspaces: vi.fn(), fetchFeatures: vi.fn(), fetchProductContext: vi.fn(),
    fetchDecisions: vi.fn(), fetchSignals: vi.fn(), fetchWorkspaceSettings: vi.fn(),
    fetchFeedbackSummary: vi.fn(), fetchFeedbackContext: vi.fn(), upsertFeature: vi.fn(),
    syncFeatures: vi.fn(), saveProductContext: vi.fn(), saveWorkspaceSettings: vi.fn(),
  },
}));
vi.mock("./hooks/useAuth", () => ({ useAuth: () => auth }));
vi.mock("./hooks/useOnlineStatus", () => ({ useOnlineStatus: () => network.online }));
vi.mock("./hooks/useMedia", () => ({ useMedia: () => false }));
vi.mock("./ThemeProvider", () => ({ useC: () => new Proxy({}, { get: () => "#888" }) }));
vi.mock("../lib/cloud-storage", () => api);
vi.mock("../lib/local-storage", async importOriginal => ({ ...await importOriginal(), saveWsFeaturesChecked: localSave }));
vi.mock("./components/LeftRail", () => ({ LeftRail: () => null }));
vi.mock("./components/RightRail", () => ({ RightRail: () => null }));
vi.mock("./components/ThemeMenu", () => ({ ThemeMenu: () => null }));
vi.mock("./components/OrgSwitcher", () => ({ OrgSwitcher: () => null }));
vi.mock("./components/CenterCanvas", () => ({ CenterCanvas: function SaveHarness({ showForm, onShowForm, onAddFeature, features, onEditingFeature, saveTarget, savePendingSync }) {
  const [error, setError] = useState("");
  const [name, setName] = useState("Draft candidate");
  return <main><p>Save target: {saveTarget}{savePendingSync ? " · pending sync" : ""}</p><input aria-label="Draft name" value={name} onChange={e => setName(e.target.value)} /><button onClick={() => onShowForm(true)}>Edit draft</button><button onClick={() => { onEditingFeature({ id: "second", name: "Another candidate" }); onShowForm(true); }}>Edit another candidate</button>{showForm && <><p>Editor draft retained</p><button onClick={() => onAddFeature({ id: "candidate", name, reach: 55, impact: 55, confidence: 20, effort: 35 }).catch(e => setError(e.message))}>Save candidate</button></>}{error && <p role="alert">{error}</p>}<p>{features.length} candidates saved</p></main>;
} }));
import App from "./App";
import { saveWsIndex, saveWsFeatures } from "../lib/local-storage";
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  auth.orgId = "org"; auth.isSignedIn = true; network.online = true;
  api.fetchWorkspaces.mockResolvedValue([{ id: "workspace", name: "Workspace" }]);
  api.fetchFeatures.mockResolvedValue({ features: [], manualOrder: [] });
  api.fetchProductContext.mockResolvedValue({});
  api.fetchDecisions.mockResolvedValue({ decisions: [] }); api.fetchSignals.mockResolvedValue({ signals: [] });
  api.fetchWorkspaceSettings.mockResolvedValue({}); api.fetchFeedbackSummary.mockResolvedValue(null); api.fetchFeedbackContext.mockResolvedValue(null);
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
