import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in — Tarazu" };
export const viewport = { themeColor: "#0E0F12" };

export default function SignInPage({ searchParams = {} }) {
  const startDecision = searchParams.start === "decision";
  const destination = startDecision ? "/app?start=decision" : "/app";
  // No Clerk configured → fall through to the app's guest mode, never dead-end.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect(destination);
  return <SignIn forceRedirectUrl={destination} signUpUrl={startDecision ? "/sign-up?start=decision" : "/sign-up"} />;
}
