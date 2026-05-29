import { defineConfig, devices } from "@playwright/test";

// Guest-mode smoke test (GitHub #28). Runs against `next dev` with no env vars,
// so the app boots in guest/localStorage mode and the AI advisor exercises its
// demo fallback (no ANTHROPIC_API_KEY).
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000, // generous: cold `next dev` route compile + hydration
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
