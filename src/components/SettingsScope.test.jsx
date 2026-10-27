import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { CenterCanvas } from "./CenterCanvas";
import { SettingsScreen } from "./SettingsScreen";
vi.mock("../ThemeProvider", () => ({ useC: () => ({}), useTheme: () => ({ themeName: "onyx", setThemeName: vi.fn(), themes: [{ id: "onyx", label: "Onyx" }] }) }));
vi.mock("./MobileAccountControls", () => ({ MobileAccountControls: () => null }));
vi.mock("./OrgScopeRow", () => ({ OrgScopeRow: () => null }));
afterEach(cleanup);
const props = { activeScreen: "settings", features: [], scored: [], sorted: [], displayOrder: [], signals: [], decisions: [], isMobile: true, sortMode: "rice", mapColorBy: "tier", mapSizeBy: "uniform", mapLabelMode: "hover" };

describe("Settings workspace boundaries", () => {
  for (const changeTeam of [false, true]) it(`resets the workspace name and destructive confirmation after ${changeTeam ? "a team change with the same workspace ID" : "a workspace change"}`, () => {
    const rename = vi.fn(); const clear = vi.fn(); const remove = vi.fn();
    const base = { ...props, onRenameWorkspace: rename, onClear: clear, onDeleteWorkspace: remove, activeWsId: "a", settingsScope: "user:team-a:a", activeWs: { id: "a", name: "First workspace" } };
    const view = render(<CenterCanvas {...base} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Uncommitted old name" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear", exact: true }));
    fireEvent.click(screen.getByRole("button", { name: "Delete", exact: true }));
    expect(screen.getAllByRole("button", { name: "Confirm", exact: true })).toHaveLength(2);
    const id = changeTeam ? "a" : "b";
    view.rerender(<CenterCanvas {...base} activeWsId={id} settingsScope={`user:team-b:${id}`} activeWs={{ id, name: "Second workspace" }} />);
    expect(screen.getByRole("textbox").value).toBe("Second workspace");
    expect(screen.queryByRole("button", { name: "Confirm", exact: true })).toBeNull();
    fireEvent.blur(screen.getByRole("textbox"));
    expect(rename).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled(); expect(remove).not.toHaveBeenCalled();
  });
});


it("labels actual browser fallback and pending sync accurately for a signed-in Settings screen", () => {
  const base = { ...props, activeWs: { id: "a", name: "Fictional" }, isSignedIn: true };
  const view = render(<SettingsScreen {...base} saveTarget="browser" />);
  expect(screen.getByText("Local (Browser)")).toBeTruthy(); expect(screen.queryByText("Cloud (Supabase)")).toBeNull();
  view.rerender(<SettingsScreen {...base} saveTarget="browser" savePendingSync />);
  expect(screen.getByText("Local (Browser) · sync pending")).toBeTruthy();
  view.rerender(<SettingsScreen {...base} saveTarget="cloud" />);
  expect(screen.getByText("Cloud (Supabase)")).toBeTruthy();
});
