import { Landing } from "../src/components/landing/Landing";
import { pageMetadata } from "../lib/metadata";
import { findRoute } from "../lib/routes";

export const metadata = pageMetadata(findRoute("/"));

export const viewport = {
  themeColor: "#0E0F12",
};

// No page-level JSON-LD here: the landing IS the WebSite node, and Organization,
// WebSite, Person, and WebApplication are all declared site-wide in app/layout.jsx.
// Adding a WebPage node for "/" would duplicate the WebSite entity, not enrich it.
export default function LandingPage() {
  return <Landing />;
}
