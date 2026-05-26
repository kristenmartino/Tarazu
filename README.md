# Tarazu

**Decision intelligence for product teams. Weigh what matters.**

Tarazu helps product teams prioritize ideas, compare tradeoffs, capture context, and generate explainable recommendations with structured frameworks like RICE — powered by Claude.

[**→ Live Demo**](https://tarazu.kristenmartino.ai) · [**→ Read the PRD**](./docs/Tarazu_PRD.pdf)

---

## What It Does

| Feature | Description |
|---------|-------------|
| **RICE Scoring** | Slider-based input for each dimension with real-time score calculation |
| **Priority Matrix** | Canvas-rendered Effort vs. Impact scatter plot with labeled quadrants |
| **AI Strategy Advisor** | One-click backlog analysis via Claude — returns top priority, quick win, risk flag, sprint plan, and strategic insight |
| **Persistent Storage** | Features save across sessions via localStorage and cloud sync |
| **Responsive** | Two-column desktop → single-column mobile via `matchMedia` |

## Why I Built This

Product managers spend 4–6 hours per sprint planning cycle on prioritization — most of it in spreadsheets. Tarazu replaces that workflow with a purpose-built decision system that enforces RICE discipline, visualizes tradeoffs, and adds AI analysis that would otherwise require a senior PM or consultant.

It sits at the intersection of **product management domain expertise** and **AI engineering** — the exact skillset I bring to PM and technical leadership roles.

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React + Next.js | Component model, fast builds, file-based routing |
| Visualization | Canvas 2D API | No library dependency; native DPI scaling, custom hit-testing |
| AI | Anthropic Claude Opus 4.6 | Structured JSON output; advanced reasoning for strategic analysis |
| Auth & Data | Clerk + Supabase | Hosted auth with cloud-synced settings and feedback |
| Deploy | Vercel | Zero-config with serverless API routes for the Claude proxy |

## Architecture Highlights

- **Centralized scoring** via `useScored` hook — RICE calculated once per state change, consumed by all components
- **Memoized canvas positions** — hover/selection interactions don't trigger position recalculation
- **Responsive breakpoint** via `window.matchMedia` hook — not CSS-in-JS or broken inline media queries
- **Dual-mode AI** — live Claude analysis via serverless proxy when available; smart demo fallback when not
- **Serverless proxy** — API key stays server-side in `/api/analyze.js`

## Getting Started

```bash
git clone https://github.com/kristenmartino/Tarazu.git
cd Tarazu
npm install
npm run dev
```

### Enable Live AI Analysis (Local Development)

1. Copy `.env.example` to `.env.local`
2. Add your Anthropic API key
3. Run both servers:
   ```bash
   # Terminal 1: Start the API server
   npm run dev:api

   # Terminal 2: Start the frontend
   npm run dev
   ```

The Next.js dev server proxies `/api` requests to the local API server.

### Production Deployment

Deploy to Vercel for automatic serverless function support (auto-detects the `/api` directory).

Without the API key, the app runs in demo mode with locally-generated analysis.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/kristenmartino/Tarazu&env=ANTHROPIC_API_KEY)

Add `ANTHROPIC_API_KEY` as an environment variable in Vercel's dashboard.

---

## Project Context

Tarazu was built as part of a portfolio demonstrating PM + AI capabilities. The full PRD — including competitive analysis, requirements with acceptance criteria, technical architecture, risk mitigations, and launch plan — is available in [`docs/Tarazu_PRD.pdf`](./docs/Tarazu_PRD.pdf). The complete brand system and product redesign spec lives in [`tarazu-brand-system-spec.md`](./tarazu-brand-system-spec.md).

**Built by [Kristen Martino](https://linkedin.com/in/kristenmartino)** · Product & AI Strategist · MS Business Analytics & AI, UT Dallas
