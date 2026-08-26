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

// Match ONLY the surface that touches Clerk — not every request.
//
// This used to be a negative matcher ("everything except _next/static,
// _next/image and favicon.ico"), which ran Clerk on the entire marketing site:
// /, /about, /pricing, /faq, /how-it-works, /blog/*, /vs/*, /frameworks/*.
// Those pages are statically prerendered, so middleware was the ONLY compute
// most of their requests did — including bot probes for things like
// /wp-admin/install.php, which are otherwise free CDN hits.
//
// The four entries below are the real Clerk surface:
//   /api/*      every route calls withUser / withAuth / verifyWorkspaceOwner
//               in lib/api-auth.js, all of which reach auth()
//   /app/*      the product shell
//   /sign-in/*  Clerk's own flows
//   /sign-up/*
//
// ⚠️ Be conservative when editing this. Unlike a bare auth() call, which
// throws, lib/api-auth.js's getUserId() swallows the error and returns null
// (`catch { return null }`, for guest mode). A route dropped from this matcher
// therefore does not fail loudly — it silently reads as signed-out and answers
// 401. Adding a route that reads a session means adding it here.
export const config = {
  matcher: [
    "/api/:path*",
    "/app/:path*",
    "/sign-in/:path*",
    "/sign-up/:path*",
  ],
};
