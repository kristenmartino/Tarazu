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
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none' stroke='%23E2AC4D' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M16 5v22M9 27h14'/%3E%3Cpath d='M6 9h20' stroke='%23ECEAE4'/%3E%3C/svg%3E",
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
        {/* JetBrains Mono for the in-app monospace labels (the ~31 literal
            `'JetBrains Mono'` refs). Inter is dropped — the app body now uses
            Figtree via --body. */}
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, background: "var(--bg)" }}>
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
