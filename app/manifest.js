import { SITE_NAME } from "../lib/site";

// Emits /manifest.webmanifest plus the <link rel="manifest"> tag.
//
// A note on `display: "standalone"`: this will NOT produce a Chrome install
// prompt. Chrome requires a service worker with a fetch handler for
// installability, and Tarazu has none. That is fine — the manifest still gives
// the OS proper icons and a name when someone adds the site to a home screen,
// which is what it is here for. Do not read this as a promise of offline
// support; if a service worker is ever added, revisit that promise deliberately.
export default function manifest() {
  return {
    name: "Tarazu — Decision Intelligence for Product Teams",
    short_name: SITE_NAME,
    description:
      "Weigh what matters. Rank product candidates, compare tradeoffs, and record the rationale behind each decision.",
    // The workspace, not the marketing page — someone who installs this wants
    // the app.
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0E0F12",
    theme_color: "#0E0F12",
    icons: [
      // Stable /public paths on purpose: app/icon.svg and friends get
      // content-hashed URLs from the file convention, which a manifest cannot
      // reference.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
