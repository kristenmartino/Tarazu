import { Landing } from "../src/components/landing/Landing";
import { pageMetadata } from "../lib/metadata";
import { findRoute } from "../lib/routes";

export const metadata = {
  ...pageMetadata(findRoute("/")),
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none' stroke='%23E2AC4D' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M16 5v22M9 27h14'/%3E%3Cpath d='M6 9h20' stroke='%23ECEAE4'/%3E%3C/svg%3E",
  },
};

export const viewport = {
  themeColor: "#0E0F12",
};

// No page-level JSON-LD here: the landing IS the WebSite node, and Organization,
// WebSite, Person, and WebApplication are all declared site-wide in app/layout.jsx.
// Adding a WebPage node for "/" would duplicate the WebSite entity, not enrich it.
export default function LandingPage() {
  return <Landing />;
}
