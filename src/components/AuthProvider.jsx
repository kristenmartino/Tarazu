"use client";
import { useUser, useOrganization } from "@clerk/nextjs";
import { AuthContext } from "../hooks/useAuth";

export function ClerkAuthProvider({ children }) {
  const { isSignedIn, isLoaded, user } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const value = {
    isSignedIn: !!isSignedIn,
    // Hold off until the org is resolved too. Reporting isLoaded before then
    // lets App's init effect run once with orgId still null and load the
    // personal workspace list for a user whose active org is an organization —
    // then correct itself a beat later, which reads as a flash of wrong data.
    isLoaded: isLoaded && orgLoaded,
    userId: user?.id || null,
    orgId: organization?.id || null,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function GuestAuthProvider({ children }) {
  const value = { isSignedIn: false, isLoaded: true, userId: null, orgId: null };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
