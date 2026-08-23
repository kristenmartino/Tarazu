import { useOrganization } from "@clerk/nextjs";
import { useC } from "../ThemeProvider";

/**
 * Settings row naming which organization the current workspace list is scoped
 * to. Worth surfacing because switching orgs in the top-bar switcher silently
 * changes which workspaces the API returns — without this, a user who lands in
 * the wrong org sees an unfamiliar (or empty) backlog and no stated reason.
 *
 * "Personal" is the honest label for a session with no active org: those
 * workspaces carry org_id = null and are reachable only via
 * verifyWorkspaceOwner's legacy owner path.
 */
const ClerkOrgScopeRow = () => {
  const C = useC();
  const { organization, isLoaded } = useOrganization();

  if (!isLoaded) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ fontSize: 10, color: C.textDim, fontFamily: "var(--mono)" }}>Team</span>
      <span style={{ fontSize: 11, color: C.text, fontFamily: "var(--mono)" }}>
        {organization?.name || "Personal"}
      </span>
    </div>
  );
};

export const OrgScopeRow = ({ isSignedIn }) => {
  // Same guard as AuthButton/OrgSwitcher: no publishable key means no Clerk
  // runtime, and a guest has no org scope to report in the first place.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !isSignedIn) return null;
  return <ClerkOrgScopeRow />;
};
