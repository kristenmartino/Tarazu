import { Bricolage_Grotesque, Figtree, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import Script from "next/script";
import "./tokens.css";

// New brand type — self-hosted via next/font, exposed as CSS variables and
// mapped to --display / --body / --mono in app/tokens.css.
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Figtree({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata = {
  title: "Tarazu — Decision Intelligence for Product Teams",
  description:
    "Weigh what matters. Tarazu helps product teams prioritize candidates, compare tradeoffs, and document decisions with structured frameworks and explainable AI.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235E8CFF' stroke-width='2'%3E%3Cline x1='4' y1='6' x2='20' y2='6' stroke-linecap='round'/%3E%3Cline x1='12' y1='6' x2='12' y2='20' stroke-linecap='round'/%3E%3Ccircle cx='5' cy='6' r='2' fill='%235E8CFF' stroke='none'/%3E%3Ccircle cx='19' cy='6' r='2' fill='%235E8CFF' stroke='none'/%3E%3C/svg%3E",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`no-js ${display.variable} ${body.variable} ${mono.variable}`}>
      <head>
        {/* Swap no-js→js before paint so the landing's reveal CSS (gated on html.js)
            never causes a flash; without JS, all content stays visible. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "document.documentElement.classList.remove('no-js');document.documentElement.classList.add('js');",
          }}
        />
        {/* App typography (Inter + JetBrains Mono) — the application UI still
            references these family names directly. Consolidated in Phase 2. */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "#0E1116" }}>
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
