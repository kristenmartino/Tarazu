// Tarazu palettes — the JS mirror of the SEMANTIC tokens in app/tokens.css.
// Hex (not var() refs) because inline-style components append alpha like
// `${C.x}20`, which var() would break.
//
// THEME SYSTEM: each theme bundles a `palette` (the hex object inline
// components read via useC()) and `vars` (the CSS-var values it pushes onto
// :root so the var(--…)-driven surfaces — landing, auth shell, tzui primitives
// — track the same theme). Add a theme = add one entry to THEMES.
//
// KEY MEANINGS (kept stable so call sites recolor in place):
//   bg/surface/...   surfaces & elevation
//   accent           success / positive (green) — tiers, success states, focus
//   blue             BRAND brass (gold) — buttons, brand accents, "strategic"
//   warn / danger    warning (amber) / danger (coral) — also Effort bar
//   purple           Confidence bar + AI / scenarios (violet-magenta)
//   reach / impact   RICE Reach (blue) + Impact (teal) — coordinated, and
//                    decoupled from accent/blue so brass stays brand-only.
// RICE dimensions map: Reach=reach · Impact=impact · Confidence=purple · Effort=danger.

// ── Balanced (dark · default) ──────────────────────────────────────────
const balanced = {
  bg: "#0E0F12", surface: "#15171C", surfaceAlt: "#1B1E25",
  surfaceSunken: "#121316", overlay: "#1F2128",
  border: "#2A2D35", borderActive: "#3A3D47",
  text: "#ECEAE4", textMuted: "#A7A294", textDim: "#706B5F",
  textOnAccent: "#1A1406", textAccent: "#E8BD6A",
  accent: "#2DD4A0", accentDim: "#2DD4A030", accentGlow: "#2DD4A018",
  success: "#2DD4A0", successDim: "#2DD4A020",
  danger: "#E5675A", dangerDim: "#E5675A20",       // also Effort
  warn: "#E89B3C", warnDim: "#E89B3C20",
  info: "#6FB1D8", infoDim: "#6FB1D820",
  blue: "#E2AC4D", blueDim: "#E2AC4D24",           // BRAND brass (no longer Impact)
  accentHover: "#ECBB63", accentPressed: "#C8923A", accentSubtle: "#E2AC4D1F", ring: "#E2AC4D",
  purple: "#B274D6", purpleDim: "#B274D61A",       // Confidence + AI (magenta-violet)
  navBg: "#0B0C0F", navBorder: "#1A1C22",
  brass: "#E2AC4D", brassDeep: "#B8842F", jade: "#74D2A8",
  reach: "#5AA0D6", impact: "#34C28C",             // RICE Reach (blue) + Impact (teal)
};

// ── Warm Light (light · on-brand parchment) ────────────────────────────
const warmLight = {
  bg: "#F3EBDD", surface: "#FCF8F0", surfaceAlt: "#FFFCF5",
  surfaceSunken: "#EBE1CE", overlay: "#FFFDF8",
  border: "#DCD0B8", borderActive: "#C9B998",
  text: "#2B2417", textMuted: "#6F6552", textDim: "#7B7257", // textDim darkened for AA on parchment
  textOnAccent: "#241803", textAccent: "#8A6410",
  accent: "#0E8A5C", accentDim: "#0E8A5C2E", accentGlow: "#0E8A5C14",
  success: "#0E8A5C", successDim: "#0E8A5C1F",
  danger: "#C5402F", dangerDim: "#C5402F1F",       // also Effort
  warn: "#9C6A12", warnDim: "#9C6A121F",
  info: "#2C79A8", infoDim: "#2C79A81F",
  blue: "#B07E18", blueDim: "#B07E1822",           // BRAND brass (deep for light)
  accentHover: "#0E9E6E", accentPressed: "#0B7048", accentSubtle: "#B07E181C", ring: "#B07E18",
  purple: "#7E55B0", purpleDim: "#7E55B016",       // Confidence + AI (deep violet)
  navBg: "#EDE3D0", navBorder: "#DCD0B8",
  brass: "#B07E18", brassDeep: "#8A6410", jade: "#0E8A5C",
  reach: "#3A78B0", impact: "#1F9E72",             // RICE (deep for light contrast)
};

// ── Colorblind-safe (dark · Okabe-Ito) ─────────────────────────────────
const colorblind = {
  bg: "#0E0F12", surface: "#15171C", surfaceAlt: "#1B1E25",
  surfaceSunken: "#121316", overlay: "#1F2128",
  border: "#2A2D35", borderActive: "#3A3D47",
  text: "#ECEAE4", textMuted: "#A7A294", textDim: "#706B5F",
  textOnAccent: "#1A1406", textAccent: "#E8BD6A",
  accent: "#1FBF93", accentDim: "#1FBF9330", accentGlow: "#1FBF9318",   // Okabe bluish-green
  success: "#1FBF93", successDim: "#1FBF9320",
  danger: "#D55E00", dangerDim: "#D55E0026",       // Effort = vermillion
  warn: "#E69F00", warnDim: "#E69F0026",           // orange
  info: "#56B4E9", infoDim: "#56B4E920",           // sky
  blue: "#E2AC4D", blueDim: "#E2AC4D24",           // BRAND brass
  accentHover: "#3FD0A8", accentPressed: "#18A07C", accentSubtle: "#E2AC4D1F", ring: "#E2AC4D",
  purple: "#CC79A7", purpleDim: "#CC79A71F",       // Confidence + AI = reddish-purple
  navBg: "#0B0C0F", navBorder: "#1A1C22",
  brass: "#E2AC4D", brassDeep: "#B8842F", jade: "#1FBF93",
  reach: "#56B4E9", impact: "#1FBF93",             // RICE sky-blue + bluish-green
};

// CSS-var blocks pushed onto :root per theme (landing / auth / tzui primitives).
const balancedVars = {
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
  "--ai": "#B274D6", "--ai-subtle": "rgba(178, 116, 214, 0.12)",
  "--ring": "#E2AC4D",
  "--viz-1": "#5AA0D6", "--viz-2": "#34C28C", "--viz-3": "#B274D6",
  "--viz-4": "#E5675A", "--viz-5": "#E2AC4D", "--viz-6": "#6FB1D8",
};
const warmLightVars = {
  "--bg": "#F3EBDD", "--bg-2": "#FCF8F0", "--bg-3": "#FFFCF5",
  "--line": "rgba(43, 36, 23, 0.14)", "--line-2": "rgba(43, 36, 23, 0.07)",
  "--brass": "#B07E18", "--brass-deep": "#8A6410", "--jade": "#0E8A5C",
  "--text": "#2B2417", "--text-soft": "#6F6552", "--text-faint": "#7B7257",
  "--surface-base": "#F3EBDD", "--surface-raised": "#FCF8F0",
  "--surface-overlay": "#FFFDF8", "--surface-sunken": "#EBE1CE",
  "--text-on-accent": "#241803", "--text-accent": "#8A6410",
  "--border": "rgba(43, 36, 23, 0.14)", "--border-strong": "rgba(43, 36, 23, 0.22)",
  "--border-subtle": "rgba(43, 36, 23, 0.08)",
  "--accent": "#B07E18", "--accent-hover": "#C79518", "--accent-pressed": "#8A6410",
  "--accent-subtle": "rgba(176, 126, 24, 0.12)",
  "--success": "#0E8A5C", "--success-subtle": "rgba(14, 138, 92, 0.12)",
  "--warning": "#9C6A12", "--warning-subtle": "rgba(156, 106, 18, 0.12)",
  "--danger": "#C5402F", "--danger-subtle": "rgba(197, 64, 47, 0.12)",
  "--info": "#2C79A8", "--info-subtle": "rgba(44, 121, 168, 0.12)",
  "--ai": "#7E55B0", "--ai-subtle": "rgba(126, 85, 176, 0.12)",
  "--ring": "#B07E18",
  "--viz-1": "#3A78B0", "--viz-2": "#1F9E72", "--viz-3": "#7E55B0",
  "--viz-4": "#C5402F", "--viz-5": "#B07E18", "--viz-6": "#2C79A8",
};
const colorblindVars = {
  "--bg": "#0E0F12", "--bg-2": "#15171C", "--bg-3": "#1B1E25",
  "--line": "rgba(236, 234, 228, 0.11)", "--line-2": "rgba(236, 234, 228, 0.055)",
  "--brass": "#E2AC4D", "--brass-deep": "#B8842F", "--jade": "#1FBF93",
  "--text": "#ECEAE4", "--text-soft": "#A7A294", "--text-faint": "#706B5F",
  "--surface-base": "#0E0F12", "--surface-raised": "#15171C",
  "--surface-overlay": "#1F2128", "--surface-sunken": "#121316",
  "--text-on-accent": "#1A1406", "--text-accent": "#E8BD6A",
  "--border": "rgba(236, 234, 228, 0.11)", "--border-strong": "rgba(236, 234, 228, 0.18)",
  "--border-subtle": "rgba(236, 234, 228, 0.06)",
  "--accent": "#E2AC4D", "--accent-hover": "#ECBB63", "--accent-pressed": "#C8923A",
  "--accent-subtle": "rgba(226, 172, 77, 0.12)",
  "--success": "#1FBF93", "--success-subtle": "rgba(31, 191, 147, 0.12)",
  "--warning": "#E69F00", "--warning-subtle": "rgba(230, 159, 0, 0.12)",
  "--danger": "#D55E00", "--danger-subtle": "rgba(213, 94, 0, 0.12)",
  "--info": "#56B4E9", "--info-subtle": "rgba(86, 180, 233, 0.12)",
  "--ai": "#CC79A7", "--ai-subtle": "rgba(204, 121, 167, 0.12)",
  "--ring": "#E2AC4D",
  "--viz-1": "#56B4E9", "--viz-2": "#1FBF93", "--viz-3": "#CC79A7",
  "--viz-4": "#D55E00", "--viz-5": "#E2AC4D", "--viz-6": "#E69F00",
};

// Theme registry. Add a theme = add an entry; the picker + useC() pick it up.
export const THEMES = {
  balanced: { label: "Balanced", palette: balanced, vars: balancedVars },
  "warm-light": { label: "Warm Light", palette: warmLight, vars: warmLightVars },
  colorblind: { label: "Colorblind-safe", palette: colorblind, vars: colorblindVars },
};

export const DEFAULT_THEME = "balanced";

// Back-compat: modules still doing `import { C }` get the default palette.
// Migrated components use `const C = useC()` to track the live theme.
export const C = THEMES[DEFAULT_THEME].palette;

// Tradeoff-map quadrant labels — a factory so colors track the live theme.
// Quick Wins = success(green) · Strategic = brass · Fill-ins = muted · Avoid = danger.
export const quadrantLabels = (theme = C) => [
  { label: "Quick Wins", sub: "High Impact · Low Effort", x: 0.25, y: 0.82, color: theme.accent },
  { label: "Strategic Bets", sub: "High Impact · High Effort", x: 0.75, y: 0.82, color: theme.blue },
  { label: "Fill-ins", sub: "Low Impact · Low Effort", x: 0.25, y: 0.18, color: theme.textMuted },
  { label: "Avoid", sub: "Low Impact · High Effort", x: 0.75, y: 0.18, color: theme.danger },
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
