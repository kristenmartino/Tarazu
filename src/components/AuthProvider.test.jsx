import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { useContext } from "react";

const { mockUseUser, mockUseOrganization } = vi.hoisted(() => ({
  mockUseUser: vi.fn(),
  mockUseOrganization: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: mockUseUser,
  useOrganization: mockUseOrganization,
}));

import { ClerkAuthProvider, GuestAuthProvider } from "./AuthProvider";
import { AuthContext } from "../hooks/useAuth";

/** Renders the context value as JSON so assertions read against real output. */
function Probe() {
  const v = useContext(AuthContext);
  return <div data-testid="ctx">{JSON.stringify(v)}</div>;
}

const ctxFrom = (ui) => JSON.parse(render(ui).getByTestId("ctx").textContent);

beforeEach(() => vi.clearAllMocks());

describe("ClerkAuthProvider", () => {
  it("exposes the active organization id", () => {
    // App's init effect keys on this. Without it in context, switching orgs in
    // the top-bar switcher never refetches and the user keeps looking at the
    // previous org's backlog.
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true, user: { id: "user_1" } });
    mockUseOrganization.mockReturnValue({ organization: { id: "org_acme" }, isLoaded: true });

    expect(ctxFrom(<ClerkAuthProvider><Probe /></ClerkAuthProvider>)).toMatchObject({
      isSignedIn: true,
      isLoaded: true,
      userId: "user_1",
      orgId: "org_acme",
    });
  });

  it("reports orgId null for a personal session", () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true, user: { id: "user_1" } });
    mockUseOrganization.mockReturnValue({ organization: null, isLoaded: true });

    expect(ctxFrom(<ClerkAuthProvider><Probe /></ClerkAuthProvider>).orgId).toBeNull();
  });

  it("withholds isLoaded until the organization has resolved too", () => {
    // The flash-of-wrong-data guard. If isLoaded went true on the user alone,
    // App's effect would run once with orgId still null, load the personal
    // workspace list for someone whose active org is an organization, then
    // correct itself a beat later.
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true, user: { id: "user_1" } });
    mockUseOrganization.mockReturnValue({ organization: null, isLoaded: false });

    expect(ctxFrom(<ClerkAuthProvider><Probe /></ClerkAuthProvider>).isLoaded).toBe(false);
  });

  it("stays unloaded while the user is still resolving", () => {
    mockUseUser.mockReturnValue({ isSignedIn: false, isLoaded: false, user: null });
    mockUseOrganization.mockReturnValue({ organization: null, isLoaded: true });

    expect(ctxFrom(<ClerkAuthProvider><Probe /></ClerkAuthProvider>).isLoaded).toBe(false);
  });
});

describe("GuestAuthProvider", () => {
  it("supplies a complete guest shape including orgId", () => {
    // Guests never reach Clerk, so this shape has to carry every key consumers
    // destructure — a missing orgId here reads as undefined, not null, and
    // would change the init effect's dependency identity.
    expect(ctxFrom(<GuestAuthProvider><Probe /></GuestAuthProvider>)).toEqual({
      isSignedIn: false,
      isLoaded: true,
      userId: null,
      orgId: null,
    });
  });
});
