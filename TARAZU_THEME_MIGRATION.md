# Tarazu — Phase 2: App-Wide Theme Migration Spec

> **Status:** awaiting sign-off on §1 (the dark decision) and §2 (the token system) before any
> component is touched. **§1 working decision: (A) fully dark, architected for (B) light later.**
>
> **Repo adaptation (important):** this codebase has **no Tailwind** — the app is styled with
> inline styles reading a JS palette object `C` (`src/theme.js`). So wherever this spec says
> "CSS vars + Tailwind `extend`", here it means **CSS vars in `app/tokens.css` + the JS `C`
> accessor re-pointed to those vars**. Net effect is the same: components consume semantic tokens,
> raw hex lives only in the token layer, and a light map later is a `:root` override (config flip),
> not a component rewrite.

**Prerequisite:** Phase 1 is done — the new landing ships at `/`, and the dark "balance-scale"
identity exists as app-level tokens + fonts (Bricolage Grotesque / Figtree / JetBrains Mono; the
`--bg`/`--brass`/`--jade`… palette). This phase brings the application UI, the Clerk auth screens,
and every other page onto that identity.

**Why this is more than the landing:** a marketing page needs ~10 colors. An app needs a system —
surfaces at multiple elevations, form and table states, status/feedback colors, focus rings, and a
chart palette — all legible on dark. Phase 1 gave us the brand colors; Phase 2 turns them into
semantic tokens and applies them everywhere.

Do not start until Phase 1 is merged and the component inventory (from Phase 1 step 1) is in hand.
Execute in the sub-phases in §6; get sign-off on §1 (the dark decision) and §2 (the token system)
before touching components.

---

## 1. The one strategic decision: fully dark vs. light/dark

- **(A) App goes fully dark.** Matches the identity, simplest token story, most distinctive. Risk:
  long sessions in a data-dense tool can fatigue in dark-only; dense tables/forms need careful
  contrast work.
- **(B) Full light + dark, brass system in both.** Most flexible, respects user preference — but
  roughly doubles the token + QA work and means designing a light brass theme that still feels
  "precision instrument."
- **(C) Keep the app's current light/dark; adopt only the type + brass accent.** Least disruptive,
  but dilutes the distinctive dark identity.

**Recommendation: (A) now, architected for (B) later.** Ship fully dark to get the identity, but
define everything as semantic tokens (§2) mapping to dark values today — so adding a light map
later is a config flip, not a component rewrite. Budget explicit care for table/form contrast (§5).

---

## 2. Token architecture — promote raw palette → semantic tokens

Phase 1's raw values stay as the **primitive** layer; add a **semantic** layer that components
consume (components never reference raw hex). Define as CSS vars in `app/tokens.css` (+ the JS `C`
map; Tailwind `extend` if/when Tailwind is added).

### Surfaces (elevation)
```
--surface-base:#0E0F12     /* page background */
--surface-raised:#15171C   /* cards, panels */
--surface-overlay:#1F2128  /* menus, popovers, modals (sit above raised) */
--surface-sunken:#121316   /* inputs, wells, code blocks */
```

### Text
```
--text-primary:#ECEAE4   --text-secondary:#A7A294   --text-tertiary:#706B5F
--text-on-accent:#1A1406  /* dark text on a brass fill — brass is light, needs dark text */
--text-accent:#E8BD6A     /* brass as small text on dark (lightened for AA) */
```

### Borders
```
--border:rgba(236,234,228,0.11)   --border-strong:rgba(236,234,228,0.18)   --border-subtle:rgba(236,234,228,0.06)
```

### Accent (brand brass) + interaction states
```
--accent:#E2AC4D   --accent-hover:#ECBB63   --accent-pressed:#C8923A
--accent-subtle:rgba(226,172,77,0.12)   /* tinted backgrounds, selected rows */
```

### Status / feedback (tuned to read on dark, distinct from the brass accent)
```
--success:#74D2A8  --success-subtle:rgba(116,210,168,0.12)
--warning:#E89B3C  --warning-subtle:rgba(232,155,60,0.12)   /* more orange than brass: "warning" ≠ "brand" */
--danger:#E5675A   --danger-subtle:rgba(229,103,90,0.12)
--info:#6FB1D8     --info-subtle:rgba(111,177,216,0.12)
```

### Focus ring (accessibility — never rely on color alone)
```
--ring:#E2AC4D   /* outline:2px solid var(--ring); outline-offset:2px on :focus-visible */
```

### Data-viz palette (scorecards/charts — medium-saturation hues that hold on dark)
```
categorical: #E2AC4D (brass), #74D2A8 (jade), #6FB1D8 (blue), #B49AE0 (violet), #E58E6A (coral), #5FBFB0 (teal)
sequential (scores/heat): a brass ramp from --surface-raised → #E2AC4D
chart chrome: gridlines var(--border-subtle); axis labels var(--text-tertiary)
```

**Deliverable:** a single tokens file (CSS vars + the `C` map) and a one-screen reference doc
mapping each semantic token to its value (with a `// light: TBD` column reserved for option B).

---

## 3. Component primitives — migrate first, screens inherit

Migrate shared primitives before any screen. Each uses semantic tokens only, with full state
coverage (default / hover / active / focus-visible / disabled / invalid):

- Buttons (primary = `--accent` bg + `--text-on-accent`; secondary = ghost/outline; destructive =
  `--danger`), inputs, textareas, selects/comboboxes, checkboxes/radios/switches, chips/badges
  (incl. the scorecard's rank/score chips), cards/panels, tables (header, row, zebra/hover via
  `--surface-raised`/`--accent-subtle`, selected), tabs, menus/dropdowns, modals/sheets/popovers
  (`--surface-overlay` + scrim), tooltips, toasts/alerts (status colors), skeletons/spinners,
  empty states.
- Verify each primitive in isolation (Storybook if present, else a scratch route) before moving on.

---

## 4. App screens — apply, don't redesign

Restyle product screens by swapping to migrated primitives + tokens; keep layout/behavior: the
dashboard/home, the priority board / scorecard (the data-dense one — §5), initiative/item detail,
the Listen → Score → Decide → Ship → Learn surfaces, plus settings. No logic changes — a skin pass
riding on §3.

---

## 5. Data density — the part dark themes get wrong

The scorecard/board is the risk area. Specify and check:

- **Table rows:** clear separation (`--border-subtle` dividers + `--surface-raised` hover,
  `--accent-subtle` for selected/top-ranked) — avoid mushy low-contrast rows.
- **Inputs:** `--surface-sunken` bg, `--border` → `--accent`/`--ring` on focus, legible
  placeholders (`--text-tertiary`, not fainter), visible disabled state.
- **Score/weight visualizations:** use the data-viz palette; bars/cells meet 3:1 against their
  background; never encode status by color alone (pair with label/icon).
- **Numbers/labels in JetBrains Mono** keep their role (scores, weights, metadata).

---

## 6. Clerk appearance — explicit, or auth will look unthemed

Clerk's components (`<SignIn/>`, `<SignUp/>`, `<UserButton/>`, `<UserProfile/>`,
`<OrganizationSwitcher/>` if used) do not inherit your CSS — set an `appearance` config on
`<ClerkProvider>` once:

```ts
appearance: {
  baseTheme: dark,                  // @clerk/themes
  variables: {
    colorPrimary: '#E2AC4D',
    colorBackground: '#15171C',     // --surface-raised
    colorInputBackground: '#121316',// --surface-sunken
    colorText: '#ECEAE4',
    colorTextSecondary: '#A7A294',
    colorInputText: '#ECEAE4',
    colorDanger: '#E5675A',
    borderRadius: '8px',
    fontFamily: 'var(--font-figtree)',
  },
  // elements: { card, headerTitle, formButtonPrimary, ... } to match the brass buttons
}
```

**Note:** `@clerk/themes` is a new dependency for `baseTheme: dark`. Phase 1 deliberately added no
new deps; flag installing `@clerk/themes` for approval, or hand-roll the equivalent via `variables`
+ `elements` (no new dep). **Acceptance:** sign-in / sign-up / user menu visually match the app
(dark surfaces, brass primary, correct fonts) — not Clerk's default light card on a dark page.

---

## 7. Other pages

Remaining marketing/legal/settings pages onto tokens + the §3 primitives. Footer byline stays
`https://kristenmartino.ai`.

---

## Recommended sequence (sub-phases)

- **2a** — Tokens (§2) + Clerk `appearance` skeleton + primitives (§3). Verify primitives in
  isolation. **← pause here for sign-off before 2b.**
- **2b** — Core app screens (§4), with the scorecard/board getting the §5 density pass.
- **2c** — Clerk screens (§6) end-to-end + any auth-adjacent pages.
- **2d** — Charts/scoring visualizations (data-viz palette) + remaining pages (§7).
- **2e** — QA: contrast, focus rings, reduced-motion, responsive, dark-only fatigue eyeball on the
  densest screen.

## Risks

- Long-session fatigue / data density (why §1 and §5 exist) — biggest one for a productivity tool.
- Clerk theming gap — auth looks off-brand if §6 is skipped.
- Chart legibility on dark — default chart-lib palettes rarely read on dark; the §2 palette is
  mandatory.
- Status-color collisions — keep warning distinct from the brass brand accent (§2).
- Scope creep — this is a skin pass; resist redesigning flows. Note un-themeable third-party
  embeds rather than forcing them.

## Done criteria

- Build / typecheck / tests pass; no hardcoded colors remain in migrated components (grep for raw hex).
- Every screen + every Clerk surface renders on the token system; primitives cover all states.
- Focus-visible rings everywhere; contrast meets AA (4.5:1 body / 3:1 large) and 3:1 for UI/chart
  elements; status never conveyed by color alone.
- Responsive at ~375 / 768 / 1200; `prefers-reduced-motion` respected.
- A light map is reservable (semantic tokens make option B a later flip) even though it isn't built now.
- Summary of changed files + any deferred TODOs.
