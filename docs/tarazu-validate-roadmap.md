# Tarazu Validate — roadmap

Tarazu Validate turns a product idea into an evidence-backed
**Build / Validate Further / Pivot / Park** recommendation, with a human in the
loop. It builds on Tarazu's existing **Signals** (the evidence layer) and
**Decisions** (the durable record).

This roadmap is intentionally incremental: each phase is a small, reviewable
slice that stays useful on its own, avoids scope sprawl, and defers anything
that touches autonomous research until the data model and AI drafting are stable.

| Phase | Scope | Status |
| --- | --- | --- |
| **1 — Local deterministic MVP** | Validate screen: idea source, key assumptions, attach Signals as evidence, 1–5 opportunity scorecard, deterministic recommendation, Save as Decision Draft. Local-first, no AI, no new tables. | ✅ Done — #46 |
| **2 — AI-assisted drafting** | "Draft with AI" using the hardened `lib/ai.js` pattern to suggest assumptions and a brief from the idea, product context, and attached signals. All output editable; the manual flow and a demo fallback are preserved. | 📋 #47 |
| **3 — Persisted briefs** | Validation briefs as first-class records (reopen, revise, compare, link to decisions). Guest + signed-in; idempotent migration. | 📋 #48 |
| **4 — Evidence depth** | Source-quality weighting, contradiction detection across evidence, and a stakeholder-friendly export/share view. | 📋 #49 · #51 · #50 |
| **5 — Controlled research import** | A reviewed import path (pasted notes / CSV / URLs / exported research) that becomes Signals/evidence with source attribution — no uncontrolled autonomous browsing. | 📋 #52 |
| **6 — Decision lifecycle** | Full **Build / Validate Further / Pivot / Park / Kill** lifecycle on top of persisted briefs and decisions. | 🔭 Future (not yet filed) |

## Principles

- **Human-in-the-loop** — AI assists; the user scores, edits, and decides. Generated content always lands in editable fields, never locked output.
- **Local-first** — every slice works in guest mode without API credentials, with a demo fallback when AI is unavailable.
- **No sprawl** — no scraping, multi-agent orchestration, or external research until phases 2–3 are stable.
- **Evidence-backed** — Signals are the evidence layer; Decisions are the durable record.

---

Related: [`README.md`](../README.md) · the brand/product spec [`tarazu-brand-system-spec.md`](../tarazu-brand-system-spec.md). The open platform tech-debt issues #41 and #42 are unrelated to Validate.
