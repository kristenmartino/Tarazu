import { Landing } from "../src/components/landing/Landing";
import { JsonLd } from "../src/components/JsonLd";
import { graph, webApplication } from "../lib/schema";
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

export default function LandingPage() {
  return (
    <>
      {/* Sibling of <Landing/>, not a child: Landing is "use client" and script
          elements inside a client tree are hydration-fragile. Organization,
          WebSite, and Person come from the root layout's graph; this one only
          adds the product node and references them by @id. */}
      <JsonLd id="ld-landing" data={graph(webApplication())} />
      <Landing />
    </>
  );
}
