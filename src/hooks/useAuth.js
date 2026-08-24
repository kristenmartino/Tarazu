import { createContext, useContext } from "react";

// orgId is the caller's ACTIVE Clerk organization, or null for a personal
// session. It lives in this context rather than being read from Clerk where
// it's needed because App's data-loading effect keys on it: /api/workspaces
// returns a different set per org, so switching orgs has to refetch or the
// user keeps looking at the previous org's backlog.
const GUEST = { isSignedIn: false, isLoaded: true, userId: null, orgId: null };
export const AuthContext = createContext(GUEST);
export const useAuth = () => useContext(AuthContext);
