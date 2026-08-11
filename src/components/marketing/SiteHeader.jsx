import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { navGroups } from "../../../lib/routes";

/**
 * Marketing header. A server component on purpose.
 *
 * The landing's equivalent toggles its mobile menu with useState, which forces
 * "use client" on the whole subtree. Here the menu is a native <details>, so the
 * entire marketing shell ships zero client JavaScript and a content page can
 * never be pulled client-side by its own chrome. It also means the menu works
 * with JS disabled — which is exactly the condition the SEO e2e test asserts under.
 */
export function SiteHeader() {
  const links = navGroups().flatMap((g) => g.entries);

  return (
    <header>
      <div className="wrap nav">
        <Link href="/" className="brand" aria-label="Tarazu home">
          <BrandMark />
          Tarazu
        </Link>

        <nav className="nav-links" aria-label="Primary">
          {links.map((route) => (
            <Link key={route.path} href={route.path}>
              {route.nav.label}
            </Link>
          ))}
        </nav>

        <div className="nav-cta">
          <Link href="/sign-up" className="btn btn-solid">
            Start prioritizing <span className="arrow">→</span>
          </Link>
          <details className="nav-mobile">
            <summary aria-label="Toggle menu">Menu</summary>
            <nav className="nav-mobile-panel" aria-label="Primary mobile">
              {links.map((route) => (
                <Link key={route.path} href={route.path}>
                  {route.nav.label}
                </Link>
              ))}
              <Link href="/sign-up">Start prioritizing</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
