"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkAuthProvider } from "./AuthProvider";
import App from "../App";
import { clerkAppearance } from "../clerkAppearance";
import { useC } from "../ThemeProvider";

export default function ClerkWrapper() {
  const C = useC(); // ClerkWrapper renders under <ThemeProvider>, so this is live
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={clerkAppearance(C)}
    >
      <ClerkAuthProvider>
        <App />
      </ClerkAuthProvider>
    </ClerkProvider>
  );
}
