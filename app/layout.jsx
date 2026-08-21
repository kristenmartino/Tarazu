import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import { SITE_URL } from "../lib/site";
import { graph, organization, website, person, webApplication } from "../lib/schema";
import { JsonLd } from "../src/components/JsonLd";
import "./tokens.css";

// New brand type — self-hosted via next/font, exposed as CSS variables and
// mapped to --display / --body / --mono in app/tokens.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  // Resolves relative OG/canonical URLs (including the generated opengraph-image)
  // to absolute ones. Inherited by every route, so child metadata can stay relative.
  metadataBase: new URL(SITE_URL),
  title: "Tarazu — Prioritization your team can defend.",
  description:
    "Weigh what matters. Tarazu helps product teams prioritize candidates, compare tradeoffs, and document decisions with structured frameworks and explainable AI.",
  // No `icons` key on purpose. An explicit metadata.icons OVERRIDES the App
  // Router file convention, so declaring one here would silently disable
  // app/icon.svg, app/favicon.ico, and app/apple-icon.png.
  //
  // Points agents and LLM tooling at the generated markdown map of the site.
  alternates: { types: { "text/markdown": "/llms.txt" } },
  // Search Console / Bing Webmaster ownership tokens.
  //
  // Deliberately NOT NEXT_PUBLIC_*: this file is a server component, so the
  // value is read at render time and never enters the client bundle. A
  // NEXT_PUBLIC_ prefix would inline it into .next/static for no reason, and
  // scripts/check-bundle-secrets.mjs guards exactly that boundary — the tokens
  // are public by nature, but pushing values across it casually is a bad habit.
  //
  // Undefined values are omitted by Next, so this is safe when unset. DNS TXT
  // verification skips this path entirely and is the better option if you own
  // the DNS; the meta tag is here because it is self-documenting and survives a
  // registrar change.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({ children }) {
  // suppressHydrationWarning: the inline script below intentionally swaps
  // no-js→js on <html> before hydration, so the className is expected to differ.
  return (
    <html
      lang="en"
      className={`no-js ${display.variable} ${body.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Swap no-js→js before paint so the landing's reveal CSS (gated on html.js)
            never causes a flash; without JS, all content stays visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.remove('no-js');document.documentElement.classList.add('js');",
          }}
        />
      </head>
      <body style={{ margin: 0, background: "var(--bg)" }}>
        {/* Site-wide identity graph. Declared once here so page-level graphs can
            reference these nodes by @id instead of restating them — a content page
            emits only its own WebPage node and points `about` at the product and
            `isPartOf` at the site. WebApplication belongs here rather than on the
            landing precisely so that reference resolves on every page. It also
            renders on the noindex routes, which costs ~1KB and nothing else. */}
        <JsonLd
          id="ld-site"
          data={graph(organization(), website(), person(), webApplication())}
        />
        {children}
        <Analytics />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">{`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
            `}</Script>
          </>
        )}
      </body>
    </html>
  );
}
