import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { AuthContext } from "../hooks/useAuth";
import { MobileAccountControls } from "./MobileAccountControls";

const { user, team, profile, switcher, signIn } = vi.hoisted(() => ({ user: vi.fn(), team: vi.fn(), profile: vi.fn(), switcher: vi.fn(), signIn: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({
  useUser: user, useOrganization: team,
  UserButton: props => { profile(props); return <button>Mock profile menu</button>; },
  OrganizationSwitcher: props => { switcher(props); return <button>Mock team menu</button>; },
  SignInButton: props => { signIn(props); return <div>{props.children}</div>; },
}));
vi.mock("../ThemeProvider", () => ({ useC: () => ({}) }));
const signedIn = { isLoaded: true, isSignedIn: true, userId: "fictional", orgId: null };
const mount = (auth = signedIn, props = {}) => render(<AuthContext.Provider value={auth}><MobileAccountControls {...props} /></AuthContext.Provider>);
let originalKey;
beforeEach(() => {
  vi.clearAllMocks(); originalKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_mock";
  user.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { fullName: "Fictional Mobile Tester" } });
  team.mockReturnValue({ isLoaded: true, organization: null });
});
afterEach(() => { cleanup(); if (originalKey === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = originalKey; });

describe("mobile account and team entry points (mocked Clerk contracts)", () => {
  it("never mounts provider hooks in the fictional demo even when Clerk is configured", () => {
    mount(signedIn, { guestDemo: true });
    expect(screen.getByText(/fictional Relay browser demo/)).toBeTruthy();
    expect(user).not.toHaveBeenCalled(); expect(team).not.toHaveBeenCalled(); expect(profile).not.toHaveBeenCalled(); expect(switcher).not.toHaveBeenCalled();
  });
  it("describes browser storage without provider hooks or an unavailable sign-in when no key is configured", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; mount();
    expect(screen.getByText("Browser workspace. Your data is stored on this device.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
    expect(user).not.toHaveBeenCalled(); expect(team).not.toHaveBeenCalled();
  });
  it("waits for auth and team loading without falsely displaying Personal", () => {
    const view = mount({ ...signedIn, isLoaded: false });
    expect(screen.getByRole("status").textContent).toContain("Loading account and team");
    expect(user).not.toHaveBeenCalled(); expect(team).not.toHaveBeenCalled();
    team.mockReturnValue({ isLoaded: false });
    view.rerender(<AuthContext.Provider value={signedIn}><MobileAccountControls /></AuthContext.Provider>);
    expect(screen.getByRole("status")).toBeTruthy(); expect(screen.queryByText("Personal")).toBeNull(); expect(profile).not.toHaveBeenCalled();
  });
  it("offers the existing modal sign-in entry for a configured signed-out session", () => {
    user.mockReturnValue({ isLoaded: true, isSignedIn: false });
    mount({ ...signedIn, isSignedIn: false, userId: null });
    expect(screen.getByRole("button", { name: "Sign in" })).toBeTruthy();
    expect(signIn.mock.calls[0][0].mode).toBe("modal");
    expect(team).not.toHaveBeenCalled(); expect(switcher).not.toHaveBeenCalled();
  });
  it("shows the signed-in identity and Personal, preserving profile sign-out and all team redirects", () => {
    mount();
    expect(screen.getByText("Fictional Mobile Tester")).toBeTruthy(); expect(screen.getByText("Personal")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Profile and sign out" })).toBeTruthy();
    expect(profile.mock.calls[0][0].afterSignOutUrl).toBe("/");
    const props = switcher.mock.calls[0][0];
    expect(props.hidePersonal).toBeFalsy();
    expect(props.afterSelectOrganizationUrl).toBe("/app"); expect(props.afterSelectPersonalUrl).toBe("/app"); expect(props.afterCreateOrganizationUrl).toBe("/app");
  });
  it("updates the team label on provider change and retains long identity text", () => {
    const longName = "Fictional long team ".repeat(15);
    user.mockReturnValue({ isLoaded: true, isSignedIn: true, user: { primaryEmailAddress: { emailAddress: "fictional.mobile@example.test" } } });
    const view = mount();
    team.mockReturnValue({ isLoaded: true, organization: { name: longName } });
    view.rerender(<AuthContext.Provider value={{ ...signedIn, orgId: "fictional-team" }}><MobileAccountControls /></AuthContext.Provider>);
    expect(screen.getByText("fictional.mobile@example.test")).toBeTruthy();
    expect(screen.getByText(longName.trim())).toBeTruthy(); expect(screen.queryByText("Personal")).toBeNull();
  });
});


it("keeps native account/team menus inert until pending context is durable", () => {
  const view = mount(signedIn, { contextSaveStatus: { state: "saving" } });
  expect(screen.getByRole("button", { name: "Mock profile menu" }).closest("[inert]")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Mock team menu" }).closest("[inert]")).toBeTruthy();
  expect(screen.getByText(/menus will be available when saving finishes/)).toBeTruthy();
  view.rerender(<AuthContext.Provider value={signedIn}><MobileAccountControls contextSaveStatus={{ state: "saved" }} savePendingSync /></AuthContext.Provider>);
  expect(screen.getByRole("button", { name: "Mock team menu" }).closest("[inert]")).toBeTruthy();
  expect(screen.getByText(/Unsynced changes may be unavailable/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Continue to account menus" }));
  expect(screen.getByRole("button", { name: "Mock profile menu" }).closest("[inert]")).toBeNull();
  expect(screen.getByRole("button", { name: "Mock team menu" }).closest("[inert]")).toBeNull();
  view.rerender(<AuthContext.Provider value={signedIn}><MobileAccountControls contextSaveStatus={{ state: "saved" }} /></AuthContext.Provider>);
  expect(screen.getByRole("button", { name: "Mock profile menu" }).closest("[inert]")).toBeNull();
  expect(screen.getByRole("button", { name: "Mock team menu" }).closest("[inert]")).toBeNull();
});


it("offers a retry on context failure without trapping the account menus", () => {
  const retry = vi.fn();
  mount(signedIn, { contextSaveStatus: { state: "error" }, onRetryContextSave: retry });
  fireEvent.click(screen.getByRole("button", { name: "Retry context save" }));
  expect(retry).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Continue to account menus" }));
  expect(screen.getByRole("button", { name: "Mock profile menu" }).closest("[inert]")).toBeNull();
});
