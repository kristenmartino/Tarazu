"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkBrassAppearance } from "../../src/clerkAppearance";

// Scoped to the (auth) route group so Clerk only loads on /sign-in & /sign-up,
// keeping the public landing free of the Clerk runtime.
export default function ClerkAuthProvider({ children }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={clerkBrassAppearance}
    >
      {children}
    </ClerkProvider>
  );
}
