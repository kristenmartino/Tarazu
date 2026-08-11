import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { navGroups } from "../../../lib/routes";

/**
 * Marketing footer, driven by lib/routes.js so a new page appears here the
 * moment it has a `nav` placement.
 *
 * No copyright year on purpose. Computing it server-side freezes the build-time
 * year into a statically prerendered page until the next deploy, and the only
 * fix — `export const revalidate` on every page — trades a fully static CDN
 * asset for an ISR revalidation to update four characters. A year is not legally
 * required in a copyright line. (The landing keeps its client-side year; that is
 * existing behaviour and not worth churning.)
 */
export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot-top">
          <div className="foot-brand">
            <Link href="/" className="brand">
              <BrandMark />
              Tarazu
            </Link>
            <p>
              The balance scale for product decisions. Weigh what matters, ship what counts,
              and learn from every call.
            </p>
          </div>

          <div className="foot-cols">
            {navGroups().map(({ group, entries }) => (
              <div className="foot-col" key={group}>
                <h4>{group}</h4>
                {entries.map((route) => (
                  <Link key={route.path} href={route.path}>
                    {route.nav.label}
                  </Link>
                ))}
              </div>
            ))}
            <div className="foot-col">
              <h4>Get started</h4>
              <Link href="/sign-up">Start prioritizing</Link>
              <Link href="/sign-in">Open the app</Link>
            </div>
          </div>
        </div>

        <div className="foot-bottom">
          <span>© Tarazu</span>
          <span>
            Designed &amp; built by <a href="https://kristenmartino.ai">Kristen Martino</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
