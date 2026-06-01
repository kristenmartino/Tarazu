import { redirect } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export const metadata = { title: "Sign in — Tarazu" };
export const viewport = { themeColor: "#0E0F12" };

export default function SignInPage() {
  // No Clerk configured → fall through to the app's guest mode, never dead-end.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return <SignIn forceRedirectUrl="/app" signUpUrl="/sign-up" />;
}
