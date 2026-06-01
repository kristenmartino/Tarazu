import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

// Clerk (and Supabase) are optional — the app runs in guest mode without keys.
// A bare clerkMiddleware() throws "Missing publishableKey" on EVERY request when
// no key is configured, which 500s the entire site (including the public landing
// and the /sign-in,/sign-up redirects). So only engage Clerk's middleware when a
// publishable key exists; otherwise pass through — keeping `/` public and letting
// the auth routes fall back to /app guest mode. We deliberately never call
// auth().protect() here: the app self-gates, and protecting routes would break
// guest mode.
const handler = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? clerkMiddleware()
  : () => NextResponse.next();

export default handler;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
