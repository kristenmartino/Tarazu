import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";

const { mockUseOrganization } = vi.hoisted(() => ({ mockUseOrganization: vi.fn() }));

vi.mock("@clerk/nextjs", () => ({ useOrganization: mockUseOrganization }));
vi.mock("../ThemeProvider", () => ({
  useC: () => ({ border: "#333", text: "#eee", textDim: "#888" }),
}));

import { OrgScopeRow } from "./OrgScopeRow";

const KEY = "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY";
let originalKey;

beforeEach(() => {
  vi.clearAllMocks();
  originalKey = process.env[KEY];
  process.env[KEY] = "pk_test_fake";
});

afterEach(() => {
  if (originalKey === undefined) delete process.env[KEY];
  else process.env[KEY] = originalKey;
});

describe("OrgScopeRow", () => {
  it("renders nothing in guest mode without calling Clerk", () => {
    delete process.env[KEY];

    const { container } = render(<OrgScopeRow isSignedIn={true} />);

    expect(container.innerHTML).toBe("");
    expect(mockUseOrganization).not.toHaveBeenCalled();
  });

  it("renders nothing for a signed-out visitor", () => {
    const { container } = render(<OrgScopeRow isSignedIn={false} />);

    expect(container.innerHTML).toBe("");
    expect(mockUseOrganization).not.toHaveBeenCalled();
  });

  it("renders nothing until the organization has resolved", () => {
    // Rendering early would briefly claim "Personal" for a user who is in fact
    // inside an org — worse than showing nothing, because it is wrong rather
    // than merely absent.
    mockUseOrganization.mockReturnValue({ organization: null, isLoaded: false });

    const { container } = render(<OrgScopeRow isSignedIn={true} />);

    expect(container.innerHTML).toBe("");
  });

  it("names the active organization", () => {
    mockUseOrganization.mockReturnValue({ organization: { name: "Acme" }, isLoaded: true });

    const { container } = render(<OrgScopeRow isSignedIn={true} />);

    expect(container.textContent).toContain("Team");
    expect(container.textContent).toContain("Acme");
  });

  it("reports Personal when there is no active organization", () => {
    // The honest label for a session with orgId null: those workspaces carry
    // org_id = null and resolve through the personal path, not an org.
    mockUseOrganization.mockReturnValue({ organization: null, isLoaded: true });

    const { container } = render(<OrgScopeRow isSignedIn={true} />);

    expect(container.textContent).toContain("Personal");
  });
});
