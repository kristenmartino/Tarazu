import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["**/*.{test,spec}.{js,jsx}"],
    exclude: [
      "**/node_modules/**",
      "**/.next/**",
      // e2e holds Playwright specs (.spec.js) — they use Playwright's runner, not vitest.
      "e2e/**",
      // Agent worktrees under .claude/ are full checkouts of this repo. Without
      // this, vitest collects every test twice — once here, once from the
      // worktree — and the run reports double the real test count while the
      // worktree's Playwright spec fails under the vitest runner. CI never sees
      // it (clean checkout), so local runs silently disagree with CI.
      ".claude/**",
      // Same failure mode: Stryker copies the whole project into sandboxes here.
      // cleanTempDir removes it after a normal run, but an interrupted or failed
      // one leaves it behind — and then the next `npm test` collects every test
      // once per sandbox, reporting a wildly inflated count against mutated
      // source. It is gitignored, so again only local runs disagree with CI.
      ".stryker-tmp/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      // Coverage answers "was this line executed", not "is it correctly
      // asserted" — see `npm run mutation` for the stronger signal.
      include: ["lib/**", "src/**", "app/**"],
      exclude: ["**/*.test.*", "**/*.spec.*", "**/*.config.*"],
    },
  },
});
