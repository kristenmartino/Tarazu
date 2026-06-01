import { Landing } from "../src/components/landing/Landing";

export const metadata = {
  title: "Tarazu — Weigh what to build next",
  description:
    "Tarazu turns scattered requests, feedback, and data into ranked, defensible product decisions — then learns from what you ship, so every call gets sharper. The balance scale for your roadmap.",
  openGraph: {
    type: "website",
    siteName: "Tarazu",
    title: "Tarazu — Weigh what to build next",
    description:
      "Turn scattered signals into ranked, defensible product decisions — and close the loop by learning from what you ship.",
  },
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' fill='none' stroke='%23E2AC4D' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M16 5v22M9 27h14'/%3E%3Cpath d='M6 9h20' stroke='%23ECEAE4'/%3E%3C/svg%3E",
  },
};

export const viewport = {
  themeColor: "#0E0F12",
};

export default function LandingPage() {
  return <Landing />;
}
