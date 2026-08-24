import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

// These components had no coverage when they shipped, and nothing in the suite
// rendered SettingsScreen either — so the guards below (guest mode, signed-out,
// not-yet-loaded) were unverified in exactly the states that matter. Clerk's
// hooks throw outside a ClerkProvider, so each guard is the only thing standing
// between guest mode and a crash on boot.

const { mockUseUser, mockUseOrganization } = vi.hoisted(() => ({
  mockUseUser: vi.fn(),
  mockUseOrganization: vi.fn(),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: mockUseUser,
  useOrganization: mockUseOrganization,
  // Stand-in that records the props the real switcher would receive, so the
  // deliberate configuration choices are asserted rather than assumed.
  OrganizationSwitcher: (props) => <div data-testid="org-switcher" data-props={JSON.stringify(props)} />,
}));

import { OrgSwitcher } from "./OrgSwitcher";

const KEY = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY";
let originalKey;

beforeEach(() => {
  vi.clearAllMocks();
  originalKey = process.env[KEY];
  process.env[KEY] = "pk_test_fake";
  mockUseOrganization.mockReturnValue({ organization: null, isLoaded: true });
});

afterEach(() => {
  if (originalKey === undefined) delete process.env[KEY];
  else process.env[KEY] = originalKey;
});

describe("OrgSwitcher", () => {
  it("renders nothing in guest mode, where Clerk is absent entirely", () => {
    // The guard that matters most: without a publishable key there is no Clerk
    // runtime, so mounting anything Clerk-rendered would throw during boot.
    delete process.env[KEY];
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const { container } = render(<OrgSwitcher />);

    expect(container.innerHTML).toBe("");
    expect(mockUseUser).not.toHaveBeenCalled();
  });

  it("renders nothing for a signed-out visitor", () => {
    mockUseUser.mockReturnValue({ isSignedIn: false, isLoaded: true });

    const { container } = render(<OrgSwitcher />);

    expect(container.innerHTML).toBe("");
  });

  it("renders nothing until Clerk has loaded", () => {
    // Rendering on the first frame would flash a sign-in prompt inside the
    // app chrome before Clerk resolves the session.
    mockUseUser.mockReturnValue({ isSignedIn: false, isLoaded: false });

    const { container } = render(<OrgSwitcher />);

    expect(container.innerHTML).toBe("");
  });

  it("renders the switcher for a signed-in user", () => {
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const { getByTestId } = render(<OrgSwitcher />);

    expect(getByTestId("org-switcher")).toBeTruthy();
  });

  it("keeps personal accounts visible", () => {
    // Deliberate. Workspaces created outside an org have org_id = null and are
    // reachable only through verifyWorkspaceOwner's personal path; hiding
    // personal mode would strand a user away from their own data.
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const props = JSON.parse(render(<OrgSwitcher />).getByTestId("org-switcher").dataset.props);

    expect(props.hidePersonal).toBeFalsy();
  });

  it("routes every post-switch destination back through /app", () => {
    // Selecting an org changes which workspaces the API returns. These props
    // are one half of keeping the view honest; the other half is App's init
    // effect keying on orgId, since /app is already mounted and Next
    // soft-navigates rather than remounting.
    mockUseUser.mockReturnValue({ isSignedIn: true, isLoaded: true });

    const props = JSON.parse(render(<OrgSwitcher />).getByTestId("org-switcher").dataset.props);

    expect(props.afterSelectOrganizationUrl).toBe("/app");
    expect(props.afterCreateOrganizationUrl).toBe("/app");
    expect(props.afterSelectPersonalUrl).toBe("/app");
  });
});
