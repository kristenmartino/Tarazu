import { OrganizationSwitcher, useUser } from "@clerk/nextjs";

/**
 * Clerk's organization switcher, which is also the invite surface: its
 * "Manage Organization" panel owns members and invitations, so a workspace
 * owner can add a teammate without this codebase implementing an invite flow.
 *
 * Personal accounts stay visible on purpose. Every workspace created before the
 * shared-workspace migration has org_id = null and is reachable only through
 * verifyWorkspaceOwner's legacy owner path; hiding personal mode would strand a
 * user with no way back to their own pre-migration data.
 *
 * Switching orgs changes which workspaces the API returns, so both URL props
 * point at /app to send the app back through its load path rather than leaving
 * a stale list on screen.
 */
const ClerkOrgSwitcher = () => {
  const { isSignedIn, isLoaded } = useUser();

  // Guests have no org and no Clerk session; rendering the switcher for them
  // would show a sign-in prompt in the middle of the app chrome.
  if (!isLoaded || !isSignedIn) return null;

  return (
    <OrganizationSwitcher
      afterSelectOrganizationUrl="/app"
      afterCreateOrganizationUrl="/app"
      afterSelectPersonalUrl="/app"
    />
  );
};

export const OrgSwitcher = () => {
  // Mirrors AuthButton: with no publishable key the app runs in pure guest mode
  // and the Clerk runtime is absent, so anything Clerk-rendered must be skipped
  // rather than mounted.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <ClerkOrgSwitcher />;
};
