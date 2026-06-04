"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { clerkAppearance } from "../../src/clerkAppearance";
import { useC } from "../../src/ThemeProvider";

// Scoped to the (auth) route group so Clerk only loads on /sign-in & /sign-up,
// keeping the public landing free of the Clerk runtime.
export default function ClerkAuthProvider({ children }) {
  const C = useC(); // no ThemeProvider on the auth shell → default palette
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance(C)}
    >
      {children}
    </ClerkProvider>
  );
}
