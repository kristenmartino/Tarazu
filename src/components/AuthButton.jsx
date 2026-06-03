import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { useC } from "../ThemeProvider";

const ClerkAuth = () => {
  const C = useC();
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <UserButton afterSignOutUrl="/" />;
  }

  return (
    <SignInButton mode="modal">
      <button
        data-no-print
        style={{
          padding: "4px 10px",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          background: "transparent",
          color: C.textMuted,
          fontSize: 10,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "'JetBrains Mono', monospace",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => { e.target.style.borderColor = C.accent; e.target.style.color = C.accent; }}
        onMouseLeave={(e) => { e.target.style.borderColor = C.border; e.target.style.color = C.textMuted; }}
      >
        Sign in
      </button>
    </SignInButton>
  );
};

export const AuthButton = () => {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return null;
  return <ClerkAuth />;
};
