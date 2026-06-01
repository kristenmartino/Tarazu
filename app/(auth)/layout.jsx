import ClerkAuthProvider from "./ClerkAuthProvider";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const shellStyle = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 30,
  padding: "48px 24px",
  background: "var(--bg)",
  color: "var(--text)",
  backgroundImage: "radial-gradient(900px 480px at 50% -10%, rgba(226,172,77,0.12), transparent 60%)",
  fontFamily: "var(--body)",
};

const brandStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 11,
  fontFamily: "var(--display)",
  fontWeight: 800,
  fontSize: 22,
  letterSpacing: "-0.03em",
  color: "var(--text)",
  textDecoration: "none",
};

export default function AuthLayout({ children }) {
  const content = (
    <div style={shellStyle}>
      <a href="/" style={brandStyle} aria-label="Tarazu home">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <path d="M16 5v22M9 27h14" stroke="#E2AC4D" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 9h20" stroke="#ECEAE4" strokeWidth="2" strokeLinecap="round" />
          <path d="M6 9l-3.5 7a4 4 0 0 0 7 0L6 9zM26 9l-3.5 7a4 4 0 0 0 7 0L26 9z" stroke="#E2AC4D" strokeWidth="1.6" strokeLinejoin="round" fill="rgba(226,172,77,0.10)" />
          <circle cx="16" cy="9" r="1.6" fill="#E2AC4D" />
        </svg>
        Tarazu
      </a>
      {children}
    </div>
  );

  // Without a Clerk publishable key the pages below redirect to /app (guest
  // mode), so we skip mounting ClerkProvider entirely.
  if (!hasClerk) return content;
  return <ClerkAuthProvider>{content}</ClerkAuthProvider>;
}
