import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import "./marketing.css";

/**
 * Page chrome for every marketing page that isn't the landing.
 *
 * Server component, and everything it renders is too — content pages must be
 * unambiguously present in the initial HTML for a crawler that never executes
 * JavaScript. If a page inside this shell ever needs interactivity, give it a
 * small "use client" island rather than marking the page itself.
 */
export function MarketingShell({ children }) {
  return (
    <div className="tz-page">
      <SiteHeader />
      <main id="top">{children}</main>
      <SiteFooter />
    </div>
  );
}
