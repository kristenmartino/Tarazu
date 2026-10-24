import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up — Tarazu" };
export const viewport = { themeColor: "#0E0F12" };

export default function SignUpPage({ searchParams = {} }) {
  const startDecision = searchParams.start === "decision";
  const destination = startDecision ? "/app?start=decision" : "/app";
  // No Clerk configured → fall through to the app's guest mode, never dead-end.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect(destination);
  return <SignUp forceRedirectUrl={destination} signInUrl={startDecision ? "/sign-in?start=decision" : "/sign-in"} />;
}
