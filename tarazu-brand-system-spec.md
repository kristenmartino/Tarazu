# Tarazu Brand System & Product Redesign Spec

Grounded in the current **Prioritize** app architecture and UI patterns, this document consolidates the full rebrand, positioning, design, UX, suite strategy, and landing-page guidance for renaming the product to **Tarazu** and evolving it into a broader product decision platform.

---

## Source grounding from the current repo

The current product already contains the foundations for a stronger brand and broader platform story:

- The README positions the app as **AI-powered product prioritization using the RICE framework**, with matrix visualization and an AI advisor.
- The app now runs as a **Next.js** product with **auth**, **Supabase**, and **analytics** in the stack.
- The current UI includes **workspaces**, **RICE scoring**, **manual ordering**, **CSV import/export**, **product context**, **AI recommendations**, **feedback dashboards**, and **feature history**.
- The matrix is already implemented as a custom responsive canvas-based **effort vs. impact** visual with hover/select behavior and quadrant labels.
- The current theme uses a dark base with accent colors for success, risk, warning, blue, and purple.

This means the product is already more than a simple scoring utility. The rebrand should make that clearer.

---

# 1. Brand foundation

## Brand name
**Tarazu**

## Meaning
A name associated with scales, weighing, balance, and judgment. That makes it stronger and more expandable than a generic descriptive name like **Prioritize**.

## Brand thesis
**Tarazu gives product teams a system for weighing decisions, not just ranking features.**

## Brand promise
**Every roadmap decision should have a framework, a rationale, and a record.**

## Market position
Tarazu should sit in a clearer, more premium category:

**Decision intelligence for product teams**

Not:
- simple feature scoring tool
- roadmap tracker
- AI chatbot for PMs

Instead:
- structured prioritization
- evidence-backed tradeoff analysis
- explainable AI recommendations
- decision memory and alignment

## Tagline
Primary:
**Weigh what matters.**

Secondary:
**Decision intelligence for product teams.**

Alternate taglines:
- Make product decisions with evidence.
- Prioritization, with judgment built in.
- From backlog noise to strategic clarity.
- A smarter way to weigh tradeoffs.

---

# 2. Brand pillars

## 1. Rigor
Tarazu is structured, not ad hoc.

## 2. Clarity
It turns backlog chaos into visible tradeoffs.

## 3. Judgment
AI supports decision-making, but does not replace disciplined thinking.

## 4. Alignment
It helps teams explain and share why choices were made.

## 5. Continuity
It creates a living record of decisions over time.

---

# 3. Brand personality

Tarazu should feel:
- intelligent
- measured
- strategic
- premium
- calm
- trustworthy
- analytical

It should not feel:
- playful startup toy
- overly neon AI lab
- generic productivity app
- hypey “10x your roadmap” SaaS

## Tone of voice
Write like a sharp product strategist, not a growth marketer.

Use language like:
- weigh
- evaluate
- tradeoffs
- evidence
- confidence
- scenario
- decision
- rationale
- alignment
- signal
- prioritization

Avoid language like:
- magic
- revolutionize
- supercharge
- turbocharge
- smash your backlog

---

# 4. Brand architecture

## Parent brand
**Tarazu**

## Product model
Use Tarazu as the master brand and expand with clear modules.

### Phase 1
- **Tarazu Core** — prioritization workspace
- **Tarazu Signals** — customer feedback and evidence layer
- **Tarazu Plan** — scenario planning and sequencing
- **Tarazu Align** — stakeholder-ready decision outputs
- **Tarazu Pulse** — outcome tracking and retrospective calibration

## Why this works
The current product already hints at these layers:
- Core = RICE scoring, workspaces, matrix, ranking
- Signals = product context, feedback context, feedback dashboard
- Plan = AI sprint order and prioritization analysis
- Align = exports, history, decision explanation potential
- Pulse = feedback events, score resolution, historical tracking hooks

---

# 5. Positioning statement

For product managers and product teams who need to make roadmap decisions quickly and credibly, Tarazu is a decision intelligence platform that combines structured prioritization frameworks, visual tradeoff analysis, and explainable AI recommendations. Unlike spreadsheets, roadmap tools focused mainly on tracking, or generic AI assistants, Tarazu is purpose-built to help teams weigh tradeoffs and document why decisions were made.

---

# 6. Messaging hierarchy

## One-line description
**Tarazu is an AI-native decision intelligence platform for product teams.**

## Homepage headline
**Weigh what matters.**

## Homepage subhead
Tarazu helps product teams prioritize ideas, compare tradeoffs, capture context, and generate explainable recommendations with structured frameworks like RICE.

## Three key benefit statements
- **Score with rigor** using structured frameworks, not instinct alone.
- **See the tradeoffs** in rankings, matrices, and scenarios.
- **Capture the rationale** behind every important product decision.

## Short elevator pitch
Tarazu replaces spreadsheet-based prioritization with a dedicated system for scoring, visualizing, and explaining product decisions. It starts with RICE and grows into a full decision layer for product planning.

---

# 7. Visual identity system

## Logo strategy

### Primary logo concept
A geometric **T** that subtly references a balance scale.

### Supporting symbol
A beam with two weighted endpoints, suggesting tradeoff rather than perfect symmetry.

### Recommended logo system
- **Primary wordmark:** Tarazu
- **Primary mark:** Scale-T monogram
- **App icon:** simplified beam + central stem
- **Favicon:** monogram only

### Logo style direction
- geometric
- balanced
- minimal
- slightly asymmetric for intelligence and realism
- no clichéd literal hanging-scale icon

## Logo motion language
Tarazu’s logo should use restrained motion:
- the beam settles microscopically into balance
- a dot slides into place on an axis
- the mark shifts from uncertainty to alignment

Avoid:
- bouncing
- flashy AI particles
- loud 3D effects

Motion should communicate:
**deliberation resolved into clarity**

---

# 8. Color palette

The current product already has a useful dark foundation. The Tarazu palette should mature it.

## Core neutrals
- **Ink 950** — `#0E1116`
- **Ink 900** — `#141922`
- **Slate 700** — `#2A3342`
- **Slate 500** — `#6F7C90`
- **Mist 100** — `#E9EEF5`
- **White** — `#FFFFFF`

## Brand accents
- **Tarazu Blue** — `#5E8CFF`
- **Balance Green** — `#6FBE8E`
- **Signal Gold** — `#D4A24C`
- **Risk Coral** — `#DF726A`
- **Insight Violet** — `#8A7DF4`

## Semantic mapping
- Blue = primary brand / CTA / strategic actions
- Green = validated value / high confidence / strong priority
- Gold = caution / needs review / unresolved
- Coral = risk / low confidence / weak fit
- Violet = AI / scenarios / recommendations

## Usage rules
Do not use every accent equally across the UI.

Recommended ratio:
- 75% neutrals
- 15% blue
- 5% green
- 3% violet
- 2% gold/coral combined

## Optional light-mode marketing palette
- Background: `#F8FAFC`
- Surface: `#FFFFFF`
- Headline: `#0F1724`
- Copy: `#445064`
- Border: `#D9E1EA`
- CTA Blue: `#5E8CFF`

Use dark-mode product screenshots on a light marketing surface.

---

# 9. Typography system

## Primary typeface
**Inter**

Why:
- modern
- highly readable
- credible for B2B SaaS
- flexible enough for both dashboard and landing page

## Secondary typeface
**JetBrains Mono**

Use for:
- formulas
- score labels
- structured AI output labels
- CSV/import/export references
- technical/system metadata

## Type scale

### Marketing
- Hero H1: 56/60, 700
- H2: 36/42, 700
- H3: 24/30, 650
- Body L: 20/30, 400
- Body M: 16/26, 400
- Caption: 13/20, 500

### Product
- App title: 20/24, 700
- Section headers: 15/20, 700
- Primary body: 13/20, 400
- Secondary body: 12/18, 400
- Labels: 11/16, 600
- Micro mono labels: 10/14, 600

## Type behavior
- Headlines: tight tracking
- UI labels: disciplined and compact
- Mono labels: sparse and intentional

---

# 10. Product naming and phrasing

The current product uses terms like “Feature,” “AI Strategy Advisor,” “Priority Matrix,” and RICE labels. Tarazu should adopt a more systematic language.

## Recommended nomenclature

### Current → Tarazu language
- Feature → **Candidate** or **Initiative**
- Priority Matrix → **Tradeoff Map**
- AI Strategy Advisor → **Decision Advisor**
- Product Context → **Strategy Brief**
- Workspaces → **Workspaces** or **Portfolios**
- Feedback Dashboard → **Signal Summary**
- Feature History → **Decision History**
- Manual Order → **Judgment Override**
- RICE Sort → **Framework Rank**

## Preferred object model
Use:
- **Candidate** for items under evaluation
- **Decision** for chosen prioritization outcomes
- **Signal** for evidence inputs
- **Scenario** for alternative ranking views

---

# 11. Product UX redesign

The current layout is a split-pane structure with a backlog pane on the left and matrix/context/AI on the right. Keep the logic, but make it feel like a platform.

## Recommended app structure

### Global nav
Left rail:
- Tarazu mark
- Workspace switcher
- Priorities
- Signals
- Decisions
- Scenarios
- Settings

### Main screen layout
- **Left rail:** navigation and workspace layer
- **Center canvas:** list / board / map / scenario views
- **Right contextual pane:** selected candidate, AI recommendation, rationale, history

This instantly elevates the product from “dashboard” to “system.”

---

# 12. Core screens

## 12.1 Workspace home
Instead of dropping users straight into a dense split view, give them a cleaner workspace overview.

Top area:
- workspace title
- product area
- last updated
- decision cycle status

Middle:
- summary stats
- top candidate
- current strategic bet
- unresolved low-confidence items
- recent decisions

Bottom:
- shortcuts into Priorities, Signals, Decisions

## 12.2 Priorities
Primary operating screen.

Views:
- List
- Tradeoff Map
- Rank
- Scenario

Key components:
- candidate cards/rows
- ranking controls
- scoring inputs
- confidence markers
- owner/status/theme metadata

## 12.3 Candidate detail drawer
When a candidate is selected, the right rail opens.

Sections:
- overview
- score breakdown
- rationale
- evidence
- history
- AI commentary

## 12.4 Tradeoff Map
This replaces the “Priority Matrix” label and becomes one of the product’s signature visuals.

Make these upgrades:
- rename it **Tradeoff Map**
- show point size by reach
- show point color by confidence
- allow labels on select or hover
- let users filter by theme or owner
- add saved views like “High confidence only”
- later: compare two scenarios side by side

## 12.5 Decision Advisor
The current AI panel is functionally strong. Reframe it as a more executive memo surface.

Structure:
- **Recommendation**
- **Why**
- **Fastest win**
- **Primary risk**
- **Suggested sequencing**
- **Questions to resolve**
- **Confidence note**
- **Alternate scenario**

## 12.6 Strategy Brief
This should be a first-class screen or right-rail section.

Fields:
- product summary
- target segment
- current business goals
- constraints
- strategic priorities
- assumptions
- success metrics

## 12.7 Decisions
A formal decision record layer.

Each decision should store:
- decision title
- chosen option
- rationale
- framework used
- evidence referenced
- approvers
- date
- expected outcome
- review date

## 12.8 Signals
Evidence layer.

Sources:
- customer feedback
- research notes
- support themes
- imported CSV/Jira/Linear tickets
- user interviews

Purpose:
Connect prioritization to evidence, not only numeric inputs.

## 12.9 Scenarios
Alternative planning views.

Examples:
- best ROI
- low-effort sprint
- high-confidence delivery
- strategic bet mode
- custom weighting

---

# 13. Tarazu Core design behavior

## Candidate list/card redesign
The current cards should evolve to include:
- title
- overall score
- confidence
- effort badge
- strategic theme
- evidence count
- last updated
- owner
- status
- rationale preview

### Visual style
- quieter than current
- stronger spacing
- less badge clutter
- clearer information hierarchy
- hover state shows “open detail panel”

## Score entry redesign
The current model is slider-based. Keep it, but add more structure:
- numeric control + slider hybrid
- rationale prompt for each dimension
- confidence helper ranges
- evidence attachment
- optional AI-assisted estimate suggestions

### Example input language
- Reach: “How many users or accounts are meaningfully affected?”
- Impact: “If delivered well, how much value does this create?”
- Confidence: “How reliable is the evidence behind this estimate?”
- Effort: “How much cost or complexity is required to deliver?”

---

# 14. Tradeoff Map redesign

The current matrix already plots effort against impact and uses quadrant labels with hover/selection behavior.

## Rename
**Tradeoff Map**

## Subtitle
See how candidates compare across effort, impact, and confidence.

## Controls
- Color by: Confidence / Theme
- Size by: Reach / Score
- Filter: High confidence / Low effort / Strategic theme
- Toggle labels: On hover / Always / Off

## Quadrants
Replace:
- Quick Wins
- Strategic Bets
- Low Hanging Fruit
- Money Pits

With:
- **Quick Wins**
- **Strategic Bets**
- **Fill-ins**
- **Avoid**

## Footer help text
X-axis: effort  
Y-axis: impact  
Point size: reach  
Point color: confidence

---

# 15. AI layer redesign

The current AI flow already outputs summary, top pick, quick win, risk flag, sprint plan, and strategic insight. Preserve that structure, but present it with more executive credibility.

## New naming
**Decision Advisor**

## Output sections
- Recommendation
- Why it ranks highest
- Fastest win
- Biggest risk
- Suggested sequencing
- Open questions
- Confidence note
- Alternate scenario

## Better labels
Replace:
- TOP PRIORITY → **Recommended next move**
- QUICK WIN → **Fastest high-value win**
- RISK FLAG → **Primary risk**
- RECOMMENDED SPRINT ORDER → **Suggested sequence**
- STRATEGIC INSIGHT → **Strategic readout**

## AI trust cues
Show:
- mode
- evidence used
- assumptions
- confidence
- missing context

This makes the AI feel like a memo engine rather than a generic chatbot panel.

---

# 16. Mobile experience

This is primarily a desktop B2B product, but mobile should support:
- reviewing rankings
- scanning top candidates
- reading AI recommendations
- approving or commenting
- viewing decisions/history

## Mobile IA
Bottom nav:
- Priorities
- Signals
- Decisions
- Profile

### Mobile interaction
- cards instead of dense tables
- summary-first
- tap into detail drawer
- simplified map view
- fewer edit-heavy workflows

Think:
**executive and PM review companion**
rather than full desktop replacement.

---

# 17. Marketing site wireframe

## Homepage

### Hero
**Weigh what matters.**

Subhead:
Tarazu helps product teams prioritize candidates, compare tradeoffs, and document decisions with structured frameworks and explainable AI.

Primary CTA:
**Start free**

Secondary CTA:
**See the product**

Supporting proof strip:
- Structured frameworks
- Visual tradeoff analysis
- Explainable AI
- Decision records

### Hero visual
Use a polished mockup of:
- left: ranked candidate list
- center: Tradeoff Map
- right: Decision Advisor

Do not show every module at once. Show one workspace and one strong recommendation.

### Section 2
**Most product prioritization still happens in spreadsheets, meetings, and opinion loops.**

Subcopy:
Teams score inconsistently, context gets lost, and decisions are hard to explain later. Tarazu gives product teams a clearer system for weighing tradeoffs.

Three problem cards:
- **Inconsistent scoring** — different stakeholders use different logic
- **Scattered context** — research, feedback, and rationale live in separate places
- **Weak decision memory** — teams remember what they chose, but not why

### Section 3
**Tarazu gives product teams a decision layer.**

Four capability blocks:
- **Structure judgment** — start with RICE and other frameworks
- **See tradeoffs clearly** — compare candidates in ranked lists and Tradeoff Maps
- **Use AI with context** — generate recommendations grounded in product strategy
- **Preserve rationale** — turn prioritization into a decision record

### Section 4
**Built for prioritization, not just tracking.**

Comparison rows:
- Framework-based scoring
- Visual tradeoff analysis
- Explainable AI recommendations
- Strategy context
- Decision history

Columns:
- Tarazu
- Spreadsheets
- Roadmap tools
- Generic AI assistants

### Section 5
**Start with RICE. Expand into decision intelligence.**

Cards:
- **Tarazu Core** — scoring, ranking, tradeoff analysis
- **Tarazu Signals** — evidence and feedback
- **Tarazu Plan** — sequencing and scenarios
- **Tarazu Align** — stakeholder-ready decision outputs
- **Tarazu Pulse** — outcome learning

### Section 6
**Designed for product teams that need clearer choices.**

Audience blocks:
- Product Managers
- Founders
- Product Ops
- Platform Teams
- Consultants

### Section 7
**Turn product debates into structured decisions.**

CTA:
**Try Tarazu**

---

# 18. Pricing page framing

Keep pricing simple early.

## Free
For solo PMs and early exploration
- 1 workspace
- core scoring
- basic Tradeoff Map
- limited AI recommendations

## Pro
For serious individual use
- unlimited workspaces
- exports
- richer AI analysis
- decision history
- saved scenarios

## Team
For shared decision-making
- shared workspaces
- comments and reviewers
- approval states
- role-based access
- team usage analytics

## Enterprise
For product orgs
- SSO
- audit history
- governance controls
- integrations
- admin visibility

---

# 19. App shell content spec

## Left rail
Top:
- Tarazu icon
- workspace switcher

Nav:
- Priorities
- Signals
- Decisions
- Scenarios
- Settings

Bottom:
- user profile
- billing
- help

## Main header on each screen
Left:
- page title
- short subtitle

Right:
- search
- filters
- primary action

## Right rail
Context panel that changes based on screen:
- selected candidate
- recommendation
- history
- strategy summary

---

# 20. Priorities screen content spec

## Header
**Priorities**  
Compare and rank what should come next.

Controls:
- View: List / Map / Scenario
- Framework: RICE
- Filter: Owner / Theme / Confidence / Effort
- Sort: Framework Rank / Judgment Override
- CTA: Add Candidate

## Candidate row format
- Rank
- Title
- Theme
- Score
- Confidence
- Effort
- Evidence
- Updated
- Open

## Empty state
**Nothing to prioritize yet.**  
Add your first candidate or import an existing backlog.

Buttons:
- Add Candidate
- Import CSV
- Load Example Backlog

---

# 21. Decision Advisor content spec

## Panel title
**Decision Advisor**

## Intro line
Recommendation generated from current candidate scores, strategy context, and available signals.

## Sections
**Recommended next move**  
[Candidate name]

**Why this rises to the top**  
Two to four sentence explanation.

**Fastest high-value win**  
Candidate with low effort and solid upside.

**Primary risk**  
Candidate whose confidence or assumptions need validation.

**Suggested sequence**  
1. Candidate A  
2. Candidate B  
3. Candidate C

**Questions to resolve**  
- Where is confidence weakest?
- What assumption most affects ranking?
- What evidence is still missing?

## Meta row
- Mode: Live / Demo
- Generated: timestamp
- Framework: RICE
- Confidence: Medium / High / Low

## Actions
- Regenerate
- Save as Decision Draft
- Share summary

---

# 22. Strategy Brief content spec

## Title
**Strategy Brief**

## Fields
- Product / area
- Target users
- Current goals
- Strategic priorities
- Constraints
- Success metrics
- Notes for recommendation engine

## Read mode
A compact summary card in the right rail

## Edit mode
A dedicated modal or panel

---

# 23. Decisions screen content spec

## Purpose
Turn prioritization outcomes into reusable organizational memory.

## Header
**Decisions**  
Track what was chosen, why it was chosen, and when to revisit it.

## Decision card
- Decision title
- Chosen candidate
- Summary rationale
- Framework used
- Evidence count
- Owner
- Date
- Review date
- Status: Draft / Approved / Archived

## Decision detail
- Recommendation snapshot
- Final rationale
- Tradeoffs considered
- Risks accepted
- Expected outcome
- Follow-up review date

---

# 24. Signals screen content spec

## Header
**Signals**  
Bring evidence into prioritization.

## Main blocks
- Research notes
- Customer feedback themes
- Support issues
- Imported backlog evidence
- Confidence calibration

## Key actions
- Add signal
- Import CSV
- Link to candidate
- Tag to theme

## Goal
Make confidence and reach less arbitrary over time.

---

# 25. Scenarios screen content spec

## Header
**Scenarios**  
Explore alternate ranking logic before you commit.

## Scenario templates
- Growth mode
- Fast wins
- Low-risk next sprint
- Strategic bets
- Custom weights

## Screen structure
Left:
- scenario presets

Center:
- candidate ranking changes

Right:
- explanation of what moved and why

---

# 26. Landing page visual direction

## Hero visual style
- dark product screenshot on a lighter marketing page
- subtle blue accents
- no excessive glow
- strong typography
- clean surrounding whitespace

## Supporting illustrations
Use abstract product diagrams:
- weighted points on axes
- evidence node clusters
- beam/scale motifs
- decision cards linked to candidates

## Motion
- candidate points settle into map positions
- right rail slides in
- recommendation blocks appear in sequence
- slight beam-balance motion in brand moments

---

# 27. Logo directions in words

## Concept 1: Scale-T
A capital T where the top stroke reads like a beam, with slightly weighted ends.

## Concept 2: Beam and pivot
Minimal horizontal line with two dots and a central pivot.

## Concept 3: Tradeoff mark
A square or quadrant mark with one highlighted weighted node.

## Recommendation
Use Concept 1 as primary.  
Use Concept 2 as supporting motif.  
Use Concept 3 in illustration and onboarding graphics.

---

# 28. Brand copy rules

## Headline style
Short. Clear. Confident.

Good:
- Weigh what matters.
- Bring rigor to prioritization.
- Turn tradeoffs into decisions.

Avoid:
- Supercharge your roadmap
- Prioritization, reimagined
- AI magic for product teams

## Product writing style
Use:
- candidates
- signals
- scenarios
- rationale
- confidence
- tradeoffs
- decisions

Avoid:
- random jargon overload
- cute metaphors everywhere
- overly casual labels like “money pits”

---

# 29. UI writing replacements

- Add Feature → **Add Candidate**
- Load Samples → **Load Example Backlog**
- Clear → **Clear Workspace**
- Run AI Strategy Analysis → **Generate Recommendation**
- Helpful? → **Was this recommendation useful?**
- Top Priority → **Recommended next move**
- Quick Win → **Fastest high-value win**
- Risk Flag → **Primary risk**
- Recommended Sprint Order → **Suggested sequence**
- Strategic Insight → **Strategic readout**

---

# 30. Visual hierarchy rules

## Rule 1
Only one dominant accent per screen.

## Rule 2
Use color for meaning, not decoration.

## Rule 3
Pills are metadata, not decoration.

## Rule 4
Mono is for system language, not body copy.

## Rule 5
Whitespace should communicate importance before borders do.

---

# 31. Design system starter tokens

## Colors
```txt
bg.default = #0E1116
bg.surface = #141922
bg.subtle = #1B2230
border.default = #273142
text.primary = #E9EEF5
text.secondary = #8A96A8
text.tertiary = #5B6677

brand.primary = #5E8CFF
brand.primarySoft = #5E8CFF1A
state.success = #6FBE8E
state.successSoft = #6FBE8E1A
state.warning = #D4A24C
state.warningSoft = #D4A24C1A
state.danger = #DF726A
state.dangerSoft = #DF726A1A
state.insight = #8A7DF4
state.insightSoft = #8A7DF41A
```

## Radius
```txt
radius.sm = 8
radius.md = 12
radius.lg = 16
radius.xl = 20
```

## Shadow
```txt
shadow.sm = 0 1px 2px rgba(0,0,0,.18)
shadow.md = 0 8px 24px rgba(0,0,0,.22)
shadow.lg = 0 18px 48px rgba(0,0,0,.28)
```

## Spacing
```txt
space.2 = 8
space.3 = 12
space.4 = 16
space.5 = 20
space.6 = 24
space.8 = 32
space.10 = 40
space.12 = 48
```

---

# 32. What to keep from the current product

Do not throw away these strengths:
- workspace model
- responsive split-pane logic
- matrix interaction model
- strategy context
- AI result structure
- feedback and history foundations

These already make the Tarazu repositioning credible.

---

# 33. What to change immediately

## Brand
- rename to Tarazu
- update copy system
- replace current logo treatment

## Visual
- mature palette
- adopt Inter + JetBrains Mono
- reduce accent clutter
- redesign AI panel

## UX
- add left rail
- rename core screens
- make Strategy Brief first-class
- formalize Decisions screen

---

# 34. Design implementation order

## Sprint 1
- typography
- color tokens
- logo/wordmark
- app rename
- section renames
- AI panel redesign

## Sprint 2
- app shell with left rail
- Priorities redesign
- Tradeoff Map controls
- candidate detail rail
- Strategy Brief redesign

## Sprint 3
- Decisions page
- Signals page shell
- landing page
- scenario mode stub

---

# 35. Suite-level positioning

If Tarazu expands beyond Core, position the suite like this:

## Tarazu Core
**Structured prioritization**  
For scoring, ranking, and comparing opportunities.

## Tarazu Signals
**Evidence ingestion**  
For customer feedback, research, support trends, and opportunity signals.

## Tarazu Plan
**Sequencing and scenario modeling**  
For sprint choices, dependency-aware planning, and roadmap options.

## Tarazu Align
**Decision communication**  
For leadership summaries, stakeholder review, and exported decision briefs.

## Tarazu Pulse
**Outcome learning**  
For checking whether prioritized bets paid off and improving future prioritization quality.

### Suite-level positioning line
**Tarazu helps teams move from prioritization to product decision intelligence.**

---

# 36. Final positioning statement

**Tarazu is a decision intelligence platform for product teams that helps them prioritize work with structured frameworks, visual tradeoff analysis, and explainable AI.**

Short brand line:
**Weigh what matters.**

---

# 37. Core strategic recommendation

The most important shift is this:

**Make Tarazu about judgment, not just scoring.**

Scoring tools are commodities.  
Judgment systems become brands.

The current product already contains the seeds of that broader identity in the workspace model, context persistence, feedback loops, AI analysis flow, and history surfaces. The rebrand should make that latent product identity visible.

---

# 38. Practical summary

If building this beyond a portfolio project, the recommendation is:

- Rename **Prioritize** to **Tarazu**
- Position it as **decision intelligence for product teams**
- Use **RICE as the entry wedge**, not the full identity
- Redesign the product around:
  - Priorities
  - Signals
  - Decisions
  - Scenarios
- Shift the UI from “clever prototype” to “premium product operations platform”
- Keep the current matrix and AI foundations, but present them with more serious product language and cleaner visual hierarchy

The most powerful conceptual shift is:

**Tarazu should feel like a system for judgment, not just a tool for scoring.**
