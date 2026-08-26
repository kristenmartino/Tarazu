/**
 * The matcher is the authentication perimeter, and it fails QUIETLY.
 *
 * `lib/api-auth.js`'s `getUserId()` swallows its error and returns null
 * (`catch { return null }`, deliberately, so guest mode runs without Clerk
 * keys). So a route that drops out of the matcher does not throw the way a
 * bare `auth()` would — `auth()` throws, the catch eats it, and the route
 * answers 401 as though the caller were signed out. A signed-in user simply
 * stops being able to use that endpoint, with nothing in the logs.
 *
 * These tests derive the route list from the filesystem rather than restating
 * it, so adding `app/api/<new>/route.js` fails here until the matcher covers
 * it, instead of shipping a silent 401.
 *
 * The second half is the reason the matcher was narrowed at all: the marketing
 * pages are statically prerendered, so middleware was the only compute most of
 * their requests did — bot probes included.
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import { config } from "./middleware.js";

vi.mock("@clerk/nextjs/server", () => ({ clerkMiddleware: () => () => {} }));

/**
 * Next's matcher syntax, reduced to the one form this file uses: a literal
 * prefix followed by `/:path*` (zero or more segments). Deliberately not a
 * general path-to-regexp — if someone introduces a different form, this throws
 * rather than quietly returning a predicate that matches nothing.
 */
function toPredicate(entry) {
  const m = /^(\/[a-z0-9\-/]*?)(?:\/:path\*)?$/i.exec(entry);
  if (!m) throw new Error(`Unsupported matcher form: ${entry}`);
  const prefix = m[1];
  return (path) => path === prefix || path.startsWith(`${prefix}/`);
}

const predicates = config.matcher.map(toPredicate);
const covered = (path) => predicates.some((p) => p(path));

/** Every app/api/**\/route.js as a concrete URL path ([id] -> x). */
function apiRoutes(dir = join(process.cwd(), "app", "api"), base = "/api") {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...apiRoutes(full, `${base}/${name.replace(/^\[.*\]$/, "x")}`));
    } else if (name === "route.js") {
      out.push(base);
    }
  }
  return out;
}

describe("middleware matcher", () => {
  it("covers every API route on disk", () => {
    const routes = apiRoutes();
    // Guard the guard: an empty list would make this pass vacuously.
    expect(routes.length).toBeGreaterThan(20);
    expect(routes.filter((r) => !covered(r))).toEqual([]);
  });

  it.each(["/app", "/app/workspace/x", "/sign-in", "/sign-in/factor-one", "/sign-up"])(
    "covers the authenticated route %s",
    (path) => {
      expect(covered(path)).toBe(true);
    },
  );

  it.each([
    "/",
    "/about",
    "/pricing",
    "/faq",
    "/how-it-works",
    "/blog",
    "/blog/some-post",
    "/vs/spreadsheets",
    "/frameworks/rice",
    "/llms.txt",
    "/robots.txt",
    // The shape of probe traffic this change exists to stop paying for.
    "/wp-admin/install.php",
  ])("does not run on the public route %s", (path) => {
    expect(covered(path)).toBe(false);
  });

  it("is not a catch-all", () => {
    // A negative lookahead matcher would match "/" and re-introduce the cost.
    expect(covered("/")).toBe(false);
    expect(config.matcher.some((m) => m.includes("(?!"))).toBe(false);
  });
});
