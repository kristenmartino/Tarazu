import { redirect } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export const metadata = { title: "Sign up — Tarazu" };
export const viewport = { themeColor: "#0E0F12" };

export default function SignUpPage() {
  // No Clerk configured → fall through to the app's guest mode, never dead-end.
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) redirect("/app");
  return <SignUp forceRedirectUrl="/app" signInUrl="/sign-in" />;
}
