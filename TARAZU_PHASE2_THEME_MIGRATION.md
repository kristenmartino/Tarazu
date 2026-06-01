# Tarazu — Phase 2 Theme Migration (PROPOSAL — not yet executed)

Phase 1 shipped the new **dark "brass" brand** on the marketing landing (`/`) and the
`/sign-in` + `/sign-up` front door, and established reusable design tokens at the app level
([app/tokens.css](app/tokens.css)) plus the type system via `next/font`. Phase 2 brings the
**application UI** (`/app`) and the auth components onto that same system.

**Status: ✅ IMPLEMENTED — Option A (fully dark-brass) + brass Clerk appearance, on branch `redesign/app-dark-brass`.** This doc remains as the rationale/record. The core recolor is done by re-pointing `C` (src/theme.js) at the brass tokens (the whole app is `C`-driven — no live hardcoded color pockets); type switched to Figtree/Bricolage; Clerk `appearance` swapped to brass. Remaining optional polish is listed at the end.

---

## The brand shift this migration absorbs

| | Phase 1 landing (new) | Current app `/app` (today) |
|---|---|---|
| Surfaces | `#0E0F12 / #15171C / #1B1E25` | `#0E1116 / #141922 / #1B2230` |
| Primary accent | **brass `#E2AC4D`** | **blue `#5E8CFF`** |
| Type | Bricolage Grotesque + Figtree + JetBrains Mono | Inter + JetBrains Mono |
| Semantic colors | jade `#74D2A8` (sparingly) | green/gold/coral/violet (data-viz) |
| Tokens | CSS vars (`app/tokens.css`) | JS object `C` in [src/theme.js](src/theme.js) |

The app is **already dark** — this is a re-accent + re-type, not a light→dark conversion.

---

## ⛳ KEY DECISION (yours to make before we start)

**Does the app go _fully dark-brass_, or keep its current dark-blue surfaces and adopt only the
brass primary + the type system?**

- **Option A — Full dark-brass repaint (recommended, with one carve-out).**
  Re-map surfaces and chrome to the brass token set, brass as the single brand/primary accent,
  Bricolage/Figtree type everywhere. **Carve-out:** keep a *semantic data-viz palette* for the
  Tradeoff Map / scores / confidence, where color encodes meaning — recolored to harmonize
  (jade = success/high-confidence, coral = risk, violet = AI, brass reserved for brand/primary).
  This honors the brand spec's rules ("one dominant accent per screen", "color for meaning, not
  decoration") while staying coherent with the landing.
  *Pro:* one premium, cohesive brand. *Con:* most work; needs a contrast/a11y pass on interactive
  states and careful Matrix recolor.

- **Option B — Lighter touch.** Keep the app's existing dark-blue surfaces + semantic colors,
  but switch the **type** to Bricolage/Figtree and the **primary CTA/brand accent** to brass.
  *Pro:* low risk, preserves Matrix color semantics untouched. *Con:* two accent worlds (brass
  brand + blue/violet data) — less fully rebranded.

**Recommendation: Option A with the data-viz carve-out.**

---

## Inventory & order of work

Everything in the app is **inline styles reading the JS `C` palette** (no CSS classes), so the
highest-leverage move is to **re-point `C` at the new tokens** and migrate font references once —
most screens then shift with little per-file work.

1. **Token foundation.** Extend [app/tokens.css](app/tokens.css) with the full app token set
   (surfaces, `--state-*` semantic colors, radii, shadows, spacing — the brand spec already has a
   starter set in [tarazu-brand-system-spec.md](tarazu-brand-system-spec.md) §31). Refactor
   `C` in [src/theme.js](src/theme.js) to read CSS vars (or align its hex values to the tokens).
2. **Type.** Move the app's `Inter` to `next/font`, set `--body`/app font, and **remove the
   temporary Google Fonts `<link>`** in [app/layout.jsx](app/layout.jsx) (this also clears the
   `no-page-custom-font` lint warning and the duplicate JetBrains Mono load left from Phase 1).
   Update the ~40 inline `fontFamily: "'Inter'…"` / `"'JetBrains Mono'…"` references to the vars.
3. **Shared primitives first** (biggest leverage): `Card`, `Pill`, `Form`, `Slider`, `dialog`,
   `StatusToast`, `ScoreBar`, buttons.
4. **App shell:** `App.jsx` header, `LeftRail`, `CenterCanvas`, `RightRail`.
5. **Screens:** `WorkspaceHome`, Priorities, `DecisionsScreen`, `SignalsScreen`, `ScenariosScreen`,
   `SettingsScreen`, `ValidateScreen`, `FeedbackDashboard`, `FeatureHistory`, `CandidateDetail`,
   `AIPanel`/`AdvisorPanel`, `ProductContext`, `ImportPanel`, `OnboardingPanel`.
6. **Tradeoff Map** ([Matrix.jsx](src/components/Matrix.jsx)) — recolor carefully; it's canvas-drawn
   and uses color to encode confidence/quadrants. Decide the semantic palette here.
7. **Favicon** — promote the brass mark from page-scoped (landing only) to the app-wide default in
   `app/layout.jsx`.

## Clerk appearance theming (called out specifically)

- [src/components/ClerkWrapper.jsx](src/components/ClerkWrapper.jsx) still uses the **old blue**
  appearance (`colorPrimary: #5E8CFF`, `colorBackground: #141922`). Phase 2 should import
  **`clerkBrassAppearance`** from [src/clerkAppearance.js](src/clerkAppearance.js) (created in
  Phase 1) and apply it there too, so `<UserButton/>` and the in-app `<SignInButton mode="modal">`
  ([AuthButton.jsx](src/components/AuthButton.jsx)) match the brass theme.
- Consider switching the in-app `<SignInButton mode="modal">` to **redirect to `/sign-in`** so
  there's one consistent auth surface instead of a modal + a page.

## ⚠️ Deployment prerequisite (discovered during Phase 1 verification)

The local `.env.local` `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is a **production key locked to
`gridpulse.kristenmartino.ai`** (a different project). Clerk refuses to initialize on any other
origin, so the live `<SignIn/>`/`<SignUp/>` widgets won't render on `localhost`, on a `*.vercel.app`
preview, **or on `tarazu.kristenmartino.ai`** until either:
- the correct **Tarazu** Clerk instance key is used, and/or
- `tarazu.kristenmartino.ai` (and any preview domains) are added to that Clerk instance's allowed
  origins.

This is independent of Phase 1/2 code. Until it's fixed, `/sign-in` & `/sign-up` either show a
non-initializing widget (key present, wrong domain) or — if the key is absent — safely redirect to
`/app` guest mode (Phase 1 already handles the no-key case).

## Risks

- **Matrix color semantics** — recoloring data-viz can change meaning; treat as its own task.
- **Contrast / a11y** — re-check interactive states (brass-on-dark focus, hover, disabled).
- **Breadth of inline styles** — wide but mechanical; centralizing through `C` + font vars limits churn.
- **Clerk key/domain** — see prerequisite above.

---

**Remaining polish (optional, post-implementation):**
- Review each screen with real data (load an example backlog) — especially the **Tradeoff Map**
  (`Matrix.jsx`) now that quadrants are Quick Wins=jade, Strategic Bets=brass, Fill-ins=neutral,
  Avoid=coral.
- Contrast/a11y pass on brass-on-dark interactive (hover/focus/disabled) states.
- Consolidate JetBrains Mono onto `next/font` and drop the remaining `<link>` (clears the
  `no-page-custom-font` lint warning) — needs the ~31 literal `'JetBrains Mono'` refs → `var(--mono)`.
- Set the correct **Tarazu** Clerk key (see prerequisite above) so the auth widgets render.
