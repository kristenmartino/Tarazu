import { useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useAuth } from "../hooks/useAuth";
import { AuthButton } from "./AuthButton";
import { OrgSwitcher } from "./OrgSwitcher";

function SignedInControls({ contextBlocked }) {
  const { user, isLoaded: userLoaded } = useUser();
  const { organization, isLoaded: teamLoaded } = useOrganization();
  if (!userLoaded || !teamLoaded) return <p role="status">Loading account and team…</p>;
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Signed-in account";
  return <>
    <div className="tz-mobile-account-row">
      <div><h4>Profile and sign out</h4><p className="tz-mobile-account-name">{name}</p><p className="tz-mobile-account-note">Open your avatar for account options.</p></div>
      <div className="tz-mobile-account-control" inert={contextBlocked ? "" : undefined} aria-disabled={contextBlocked || undefined}><AuthButton /></div>
    </div>
    <div className="tz-mobile-account-row tz-mobile-team-row">
      <div><h4>Current team</h4><p className="tz-mobile-account-name">{organization?.name || "Personal"}</p><p className="tz-mobile-account-note">Switch between Personal and your teams.</p></div>
      <div className="tz-mobile-account-control" inert={contextBlocked ? "" : undefined} aria-disabled={contextBlocked || undefined}><OrgSwitcher /></div>
    </div>
  </>;
}

export function MobileAccountControls({ guestDemo = false, contextSaveStatus, savePendingSync = false, onRetryContextSave }) {
  const auth = useAuth();
  const [acknowledgedStatus, setAcknowledgedStatus] = useState(null);
  const saving = contextSaveStatus?.state === "saving";
  const unsynced = savePendingSync || ["pending", "error"].includes(contextSaveStatus?.state);
  const pendingToken = contextSaveStatus || "pending";
  const contextBlocked = saving || (unsynced && acknowledgedStatus !== pendingToken);
  const configured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <section className="tz-mobile-account" aria-label="Account and team">
    <h3>Account and team</h3>
    {guestDemo ? <p className="tz-mobile-account-note">This is the fictional Relay browser demo. Account and team controls are available in your own workspace.</p>
      : !configured ? <p className="tz-mobile-account-note">Browser workspace. Your data is stored on this device.</p>
      : !auth.isLoaded ? <p role="status">Loading account and team…</p>
      : auth.isSignedIn ? <><SignedInControls contextBlocked={contextBlocked} />{saving ? <p role="status" className="tz-mobile-account-note">Saving workspace context. Account and team menus will be available when saving finishes.</p> : unsynced && <div className="tz-mobile-account-warning"><p className="tz-mobile-account-note">Workspace context has not synced to the cloud. Unsynced changes may be unavailable after switching teams or signing out. Copy them first, or retry saving.</p><div className="tz-mobile-account-actions">{onRetryContextSave && <button onClick={onRetryContextSave}>Retry context save</button>}{contextBlocked && <button onClick={() => setAcknowledgedStatus(pendingToken)}>Continue to account menus</button>}</div></div>}</>
      : <div className="tz-mobile-account-row"><div><h4>Sign in</h4><p className="tz-mobile-account-note">You’re working in this browser. Sign in for your profile, team workspaces and cloud saving.</p></div><div className="tz-mobile-account-control"><AuthButton /></div></div>}
  </section>;
}
