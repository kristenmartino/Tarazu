"use client";
import dynamic from "next/dynamic";
import { GuestAuthProvider } from "../../src/components/AuthProvider";
import { ThemeProvider } from "../../src/ThemeProvider";
import App from "../../src/App";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Only load Clerk when configured — keeps bundle small and avoids import errors without keys
const ClerkPage = clerkKey
  ? dynamic(() => import("../../src/components/ClerkWrapper"), { ssr: false })
  : null;

export default function AppPage() {
  // ThemeProvider wraps both auth paths so App + descendants can read the live
  // theme via useC(), and the :root CSS-var sync runs for the whole /app SPA.
  return (
    <ThemeProvider>
      {ClerkPage ? (
        <ClerkPage />
      ) : (
        <GuestAuthProvider>
          <App />
        </GuestAuthProvider>
      )}
    </ThemeProvider>
  );
}
