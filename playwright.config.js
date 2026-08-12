import { defineConfig, devices } from "@playwright/test";

// Guest-mode smoke test (GitHub #28) plus the SEO suite. The web server is
// started with the AI, auth, and database variables blanked (see `env` below),
// so the app boots in guest/localStorage mode and the advisor exercises its
// demo fallback regardless of what the developer has in .env.local.
//
// Deliberately NOT 3000: that port is the default for every Next/Vite/CRA app
// on a developer's machine, and `reuseExistingServer` would happily point the
// suite at whichever one happened to be running.
const PORT = Number(process.env.E2E_PORT || 3100);

export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000, // generous: cold `next dev` route compile + hydration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Always boot our own server. Reusing an existing one is a silent
    // correctness hazard: Playwright only checks that *something* answers the
    // URL, not that it is this app, so a stray server tests the wrong code.
    // With reuse off, a busy port fails fast and by name instead.
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    // `next dev` auto-loads .env.local, so "runs with no env vars" was only ever
    // true on a machine that had never configured the app. With a real
    // ANTHROPIC_API_KEY present the advisor takes the live path and the
    // demo-fallback assertion fails — a test that passed or failed depending on
    // whose laptop it ran on. Next does not overwrite variables already present
    // in process.env, so blanking them here beats .env.local and makes the run
    // hermetic.
    env: {
      ANTHROPIC_API_KEY: "",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "",
      CLERK_SECRET_KEY: "",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
    },
  },
});
