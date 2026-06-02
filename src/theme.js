// Tarazu "brass" palette — the JS mirror of the SEMANTIC tokens in app/tokens.css
// (hex, not var() refs, because existing inline-style components append alpha like
// `${C.x}20` — var() refs would break that; migrating those ~49 sites to color-mix
// is the 2b cleanup). Keys keep their historical meaning so existing usages recolor
// in place: `blue` = primary/brand (brass), `accent` = success/high-confidence (jade),
// `warn` = warning (now orange, distinct from brass), `danger` = danger, `purple` = AI.
// New components should prefer the CSS vars (var(--accent), var(--surface-raised)…).
export const C = {
  // surfaces / elevation
  bg: "#0E0F12", surface: "#15171C", surfaceAlt: "#1B1E25",
  surfaceSunken: "#121316", overlay: "#1F2128",
  // borders
  border: "#2A2D35", borderActive: "#3A3D47",
  // text
  text: "#ECEAE4", textMuted: "#A7A294", textDim: "#706B5F",
  textOnAccent: "#1A1406", textAccent: "#E8BD6A",
  // success / high-confidence (jade)
  accent: "#2DD4A0", accentDim: "#2DD4A030", accentGlow: "#2DD4A018", // jade → vivid emerald
  success: "#2DD4A0", successDim: "#2DD4A020",
  // status
  danger: "#E5675A", dangerDim: "#E5675A20",
  warn: "#E89B3C", warnDim: "#E89B3C20",   // warning → orange (≠ brass brand)
  info: "#6FB1D8", infoDim: "#6FB1D820",
  // primary / brand (brass) — `blue` key kept so existing call sites recolor in place
  blue: "#E2AC4D", blueDim: "#E2AC4D24",
  accentHover: "#ECBB63", accentPressed: "#C8923A", accentSubtle: "#E2AC4D1F", ring: "#E2AC4D",
  // AI / scenarios accent (violet) — aligned to the data-viz violet (--viz-4 / --ai).
  // Refreshed from the pre-rebrand #8A7DF4, which read blue-leaning (like the old primary).
  purple: "#B16CF0", purpleDim: "#B16CF01A", // vivid violet (was pastel #B49AE0)
  // chrome
  navBg: "#0B0C0F", navBorder: "#1A1C22",
  // raw brand aliases
  brass: "#E2AC4D", brassDeep: "#B8842F", jade: "#74D2A8",
};

export const QUADRANT_LABELS = [
  { label: "Quick Wins", sub: "High Impact · Low Effort", x: 0.25, y: 0.82, color: C.accent },
  { label: "Strategic Bets", sub: "High Impact · High Effort", x: 0.75, y: 0.82, color: C.blue },
  { label: "Fill-ins", sub: "Low Impact · Low Effort", x: 0.25, y: 0.18, color: C.textMuted },
  { label: "Avoid", sub: "Low Impact · High Effort", x: 0.75, y: 0.18, color: C.danger },
];

export const SAMPLES = [
  { id: "r20", name: "Feature Editing", description: "Modify RICE scores post-creation — users discover scoring errors after initial input and need to adjust without deleting and recreating", reach: 95, impact: 70, confidence: 95, effort: 15 },
  { id: "r21", name: "Export to CSV/PDF", description: "Generate formatted exports for stakeholder distribution — PMs need to share rankings outside the tool in Slack, decks, and emails", reach: 75, impact: 65, confidence: 85, effort: 35 },
  { id: "r23", name: "Drag-and-Drop Reorder", description: "Manual reordering with score override when strategic judgment disagrees with RICE — visual indicator distinguishes overridden items", reach: 60, impact: 75, confidence: 60, effort: 55 },
  { id: "r22", name: "Multiple Workspaces", description: "Named backlog workspaces for PMs managing multiple product areas simultaneously with workspace switching and storage partitioning", reach: 50, impact: 60, confidence: 70, effort: 45 },
  { id: "r24", name: "Jira/Linear Import", description: "CSV or API import from existing project trackers to reduce data entry — field mapping varies across orgs, auth flows add complexity", reach: 40, impact: 55, confidence: 50, effort: 70 },
  { id: "r25", name: "Team Collaboration", description: "Shared workspaces with real-time multi-user access, conflict resolution, and permissions — the killer feature for product teams at scale", reach: 35, impact: 80, confidence: 35, effort: 90 },
  { id: "r26", name: "Historical Trend Tracking", description: "Versioned score history with timeline visualization — enables retrospective analysis of whether priorities actually shifted over time", reach: 30, impact: 50, confidence: 40, effort: 65 },
];
