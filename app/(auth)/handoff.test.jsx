import { afterEach, expect, it, vi } from "vitest";
const { redirect } = vi.hoisted(() => ({ redirect: vi.fn(destination => { throw new Error(`Redirect:${destination}`); }) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@clerk/nextjs", () => ({ SignIn: () => null, SignUp: () => null }));
import SignInPage from "./sign-in/[[...sign-in]]/page";
import SignUpPage from "./sign-up/[[...sign-up]]/page";
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

it.each([[SignInPage,"signUpUrl","/sign-up"],[SignUpPage,"signInUrl","/sign-in"]])("preserves a whitelisted decision handoff across both auth pages", (Page,otherProp,otherPath) => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","configured-test-key");
  const screen=Page({searchParams:{start:"decision"}});
  expect(screen.props.forceRedirectUrl).toBe("/app?start=decision");
  expect(screen.props[otherProp]).toBe(`${otherPath}?start=decision`);
  expect(Page({searchParams:{start:"https://untrusted.example/"}}).props.forceRedirectUrl).toBe("/app");
});
it.each([SignInPage,SignUpPage])("keeps the same handoff when auth is unavailable", Page => {
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY","");
  expect(()=>Page({searchParams:{start:"decision"}})).toThrow("Redirect:/app?start=decision");
  expect(()=>Page({searchParams:{}})).toThrow("Redirect:/app");
});
