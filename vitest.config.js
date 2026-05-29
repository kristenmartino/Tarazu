import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.{test,spec}.{js,jsx}"],
    // e2e holds Playwright specs (.spec.js) — they use Playwright's runner, not vitest.
    exclude: ["node_modules", ".next", "e2e/**"],
  },
});
