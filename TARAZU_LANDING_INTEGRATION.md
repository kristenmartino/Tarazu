# Tarazu Landing Page — Integration Brief

**Design source of truth:** `tarazu-landing-page.html` (a complete, self-contained marketing landing page — HTML + inline CSS + vanilla JS, dark theme).
**Goal:** Wire this into the real Tarazu app as a proper Next.js route, preserving the design exactly while matching the project's existing conventions. Do **not** introduce a new styling paradigm or new dependencies.

> Stack note: Tarazu is Next.js + Supabase + **Clerk** (auth). Current prod is `prioritize.kristenmartino.ai`, migrating to `tarazu.kristenmartino.ai`.

---

## 0. Inspect before coding
Confirm and report:
- Next.js version + router (App vs Pages), TypeScript?
- Styling system: Tailwind / CSS Modules / global CSS / other
- Current font setup (next/font?)
- **Clerk middleware config** — which routes are public vs protected, and where sign-in / the app shell live
- What currently renders at `/`, where layout + `metadata` live, where shared components live

Port into whatever is already there. Match naming, file layout, and lint rules.

---

## 1. Routing + Clerk (resolve first)
This is a **public marketing page** — it must render without auth.
- Make the landing route **public in Clerk's middleware** (add it to the public matcher / `publicRoutes`). Verify a signed-out visitor sees it with no redirect to sign-in.
- Decide where it lives: most likely the public root `/`, with the authenticated product behind it.
- The CTAs ("Start prioritizing", "Open the app" — 5 links) currently point to **`https://prioritize.kristenmartino.ai`**. Repoint them to the real in-app destination — e.g. the Clerk **sign-in / sign-up** route or the app dashboard route — **not** the marketing root (or they'll loop). Also update the domain to `tarazu.kristenmartino.ai` if the migration is done.

**Ask the owner to confirm the app/sign-in route before wiring the links.**

---

## 2. Fonts (move to `next/font/google`)
Remove the Google Fonts `<link>` and load via `next/font/google`:
- **Bricolage Grotesque** — display/headlines. Weights: 500, 600, 700, 800 (optical-size axis 12–96).
- **Figtree** — body. Weights: 400, 500, 600, 700.
- **JetBrains Mono** — eyebrows / labels / scores / metadata. Weights: 400, 500.

Expose as CSS variables (`--display`, `--body`, `--mono`) so the existing CSS keeps working.

---

## 3. Design tokens (preserve exactly — this is a DARK theme)
```
--bg:#0E0F12        --bg-2:#15171C       --bg-3:#1B1E25
--text:#ECEAE4      --text-soft:#A7A294  --text-faint:#706B5F
--brass:#E2AC4D            (primary accent)
--brass-deep:#B8842F       (keep distinct)
--jade:#74D2A8             (positive / "live" indicator — used sparingly)
--line:rgba(236,234,228,0.11)   --line-2:rgba(236,234,228,0.055)
```
Also preserve the **atmosphere**: the fixed radial-gradient glows on `body` (amber top-right, faint jade left) and the low-opacity grain overlay. If the project uses Tailwind, add tokens to the theme; otherwise keep `:root` globals or a scoped module. Don't recolor.

---

## 4. Sections (in order)
1. Sticky header / nav (+ mobile menu)
2. **Hero** — headline, lede, two CTAs, + the **balance-scale SVG** (the signature visual)
3. **Definition strip** ("ta·ra·zu / noun / the balance scales…")
4. **Lifecycle** loop (`#lifecycle`) — Listen → Score → Decide → Ship → Learn, with the "Learn feeds back into Listen" return note
5. **Showcase** (`#features`) — 4-item feature list + the **priority-scorecard mock** (weighted Impact/Effort/Confidence → ranked Score, top row highlighted, editable-weights footer)
6. **Why Tarazu** (`#why`)
7. **CTA** band
8. **Footer** (byline links to `https://kristenmartino.ai` — keep it)

Anchors used: `#top`, `#lifecycle`, `#features`, `#why`. Keep `scroll-behavior:smooth`. **No email form** on this page — CTAs are app links only.

---

## 5. Interactivity → one `'use client'` component
Port the inline `<script>` into a single client component. Preserve:
- **Mobile menu** toggle (open/close, `aria-expanded`, closes on link click)
- **Scroll reveals** via `IntersectionObserver` on `[data-reveal]` → adds `.in`; if no IO or reduced-motion, reveal everything immediately
- **Current year** in footer

Keep these as **CSS** (gated behind `prefers-reduced-motion: no-preference` + a `js` class), don't JS them:
- Hero staggered load
- The **balance-scale settle animation** (`@keyframes settle` rotating `.scale-beam` from tilted to level — uses `transform-box:fill-box; transform-origin:center`)

Keep the `html.js` / `no-js` class swap so content is fully visible without JS.

---

## 6. Accessibility & SEO (preserve)
- `prefers-reduced-motion` fallbacks, visible focus states, semantic landmarks (`header`/`main`/`section`/`footer`), `role="img"` + `aria-label` on the scale SVG and the scorecard mock, `aria-hidden` on decorative SVGs, maintained contrast on the dark theme.
- Move `<title>` / `meta description` / `theme-color` (`#0E0F12`) / Open Graph tags into the Next **Metadata API**. Keep `theme-color` dark so mobile chrome matches.

---

## 7. Verify before done
- `build`, `lint`, `typecheck` pass
- **Signed-out visitor reaches the page with no auth redirect** (Clerk public route works)
- Mobile menu works; layout responsive at ~375 / 768 / 1200
- Reduced-motion behaves (scale sits level, no animation, all content visible)
- Every link resolves (anchors + app/sign-in route + byline)
- No console errors; Lighthouse SEO + a11y sane

Then summarize what changed and list any TODOs (the app/sign-in CTA route, the domain swap to `tarazu.kristenmartino.ai`).
