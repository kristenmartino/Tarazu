// Tarazu palettes — the JS mirror of the SEMANTIC tokens in app/tokens.css.
// Hex (not var() refs) because inline-style components append alpha like
// `${C.x}20`, which var() would break. Keys keep their historical meaning so
// existing call sites recolor in place: `blue` = primary/brand (brass),
// `accent` = success/high-confidence (jade/emerald), `warn` = warning (orange,
// distinct from brass), `danger` = danger, `purple` = AI/scenarios (violet).
//
// THEME SYSTEM: each theme bundles a `palette` (the hex object inline
// components read via useC()) and `vars` (the CSS-var values it pushes onto
// :root so the var(--…)-driven surfaces — landing, auth shell, tzui primitives
// — track the same theme). `brass.vars` is verbatim app/tokens.css, so
// selecting Brass is a no-op vs today. Add a theme = add one entry to THEMES.
const brass = {
  // surfaces / elevation
  bg: "#0E0F12", surface: "#15171C", surfaceAlt: "#1B1E25",
  surfaceSunken: "#121316", overlay: "#1F2128",
  // borders
  border: "#2A2D35", borderActive: "#3A3D47",
  // text
  text: "#ECEAE4", textMuted: "#A7A294", textDim: "#706B5F",
  textOnAccent: "#1A1406", textAccent: "#E8BD6A",
  // success / high-confidence (jade → emerald)
  accent: "#2DD4A0", accentDim: "#2DD4A030", accentGlow: "#2DD4A018",
  success: "#2DD4A0", successDim: "#2DD4A020",
  // status
  danger: "#E5675A", dangerDim: "#E5675A20",
  warn: "#E89B3C", warnDim: "#E89B3C20",   // warning → orange (≠ brass brand)
  info: "#6FB1D8", infoDim: "#6FB1D820",
  // primary / brand (brass) — `blue` key kept so existing call sites recolor in place
  blue: "#E2AC4D", blueDim: "#E2AC4D24",
  accentHover: "#ECBB63", accentPressed: "#C8923A", accentSubtle: "#E2AC4D1F", ring: "#E2AC4D",
  // AI / scenarios accent (violet) — aligned to --viz-4 / --ai
  purple: "#B16CF0", purpleDim: "#B16CF01A",
  // chrome
  navBg: "#0B0C0F", navBorder: "#1A1C22",
  // raw brand aliases
  brass: "#E2AC4D", brassDeep: "#B8842F", jade: "#74D2A8",
};

// The CSS-var values Brass drives — verbatim app/tokens.css :root, so the
// runtime sync is a no-op for Brass. Aliases like --text-primary reference
// --text and follow automatically (omitted here); type/radius vars aren't
// theme colors and stay in tokens.css.
const brassVars = {
  "--bg": "#0E0F12", "--bg-2": "#15171C", "--bg-3": "#1B1E25",
  "--line": "rgba(236, 234, 228, 0.11)", "--line-2": "rgba(236, 234, 228, 0.055)",
  "--brass": "#E2AC4D", "--brass-deep": "#B8842F", "--jade": "#74D2A8",
  "--text": "#ECEAE4", "--text-soft": "#A7A294", "--text-faint": "#706B5F",
  "--surface-base": "#0E0F12", "--surface-raised": "#15171C",
  "--surface-overlay": "#1F2128", "--surface-sunken": "#121316",
  "--text-on-accent": "#1A1406", "--text-accent": "#E8BD6A",
  "--border": "rgba(236, 234, 228, 0.11)", "--border-strong": "rgba(236, 234, 228, 0.18)",
  "--border-subtle": "rgba(236, 234, 228, 0.06)",
  "--accent": "#E2AC4D", "--accent-hover": "#ECBB63", "--accent-pressed": "#C8923A",
  "--accent-subtle": "rgba(226, 172, 77, 0.12)",
  "--success": "#2DD4A0", "--success-subtle": "rgba(45, 212, 160, 0.12)",
  "--warning": "#E89B3C", "--warning-subtle": "rgba(232, 155, 60, 0.12)",
  "--danger": "#E5675A", "--danger-subtle": "rgba(229, 103, 90, 0.12)",
  "--info": "#6FB1D8", "--info-subtle": "rgba(111, 177, 216, 0.12)",
  "--ai": "#B16CF0", "--ai-subtle": "rgba(177, 108, 240, 0.12)",
  "--ring": "#E2AC4D",
  "--viz-1": "#E2AC4D", "--viz-2": "#2DD4A0", "--viz-3": "#6FB1D8",
  "--viz-4": "#B16CF0", "--viz-5": "#E58E6A", "--viz-6": "#5FBFB0",
};

// Theme registry. Add Light / Vivid / High-contrast as new entries (each a
// { label, palette, vars }); the switcher and useC() pick them up automatically.
export const THEMES = {
  brass: { label: "Brass", palette: brass, vars: brassVars },
};

export const DEFAULT_THEME = "brass";

// Back-compat: modules still doing `import { C }` get the default (Brass)
// palette. Migrated components use `const C = useC()` to track the live theme.
export const C = THEMES[DEFAULT_THEME].palette;

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
