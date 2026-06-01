"use client";
import { ClerkProvider } from "@clerk/nextjs";
import { ClerkAuthProvider } from "./AuthProvider";
import App from "../App";
import { clerkBrassAppearance } from "../clerkAppearance";

export default function ClerkWrapper() {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={clerkBrassAppearance}
    >
      <ClerkAuthProvider>
        <App />
      </ClerkAuthProvider>
    </ClerkProvider>
  );
}
