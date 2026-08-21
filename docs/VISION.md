# Tarazu: Product Vision

**Status:** Draft. Not validated with customers.
**Owner:** Kristen Martino
**Last updated:** 2026-08-20
**Reviewers:** none yet

---

## 1. Context

Tarazu is a prioritization tool for product teams. It scores a backlog with
RICE, plots effort against impact, and uses an LLM to draft scores and analyze
the resulting ranking. It has been live at tarazu.app since February 2026.

Current state:

| | |
|---|---|
| Users | Fewer than 5, all personal contacts |
| Revenue | $0. No payment integration exists |
| Pricing page | One tier available (Free, $0). Pro, Team, Enterprise marked "Planned" |
| Stack | Next.js 14, Clerk, Supabase, Anthropic API, Vercel |
| Marketing | 7 SEO pages and 7 posts, indexed, no measurable traffic. `llms.txt`/`llms-full.txt` shipped and tested (`e2e/seo.spec.js`) — AI-answer-engine discoverability (ChatGPT, Perplexity, Claude), not yet leaned on as a deliberate content strategy |

The product works and is not adopted. This document proposes why, and what to
change.

---

## 2. Problem

Prioritization tools assume the decision is made inside the tool. In practice
the decision is made in a discussion — a Slack thread, a planning meeting, a
doc comment — and the tool is opened afterward to record a conclusion that has
already been reached.

Three observable consequences:

1. **Scores are fitted to the decision.** A reach estimate produced in the same
   meeting as the score, by the person advocating for the item, is not an
   independent input. It gets treated as data anyway, because it appears in the
   same column as numbers that came from analytics.
2. **Decision logs are not maintained.** Industry write-ups on decision-log
   adoption consistently identify the same cause: logging is duplicate work
   when the decision happened elsewhere. Teams abandon the log, or maintain it
   for compliance while real decisions live in a spreadsheet.
3. **The same decision is re-argued.** One published estimate puts the cost of
   re-litigating settled decisions at roughly $180K/year for a five-PM team. We
   have not independently verified this figure and are not relying on it.

This also explains Tarazu's adoption problem so far. The current product asks one
person to score a backlog alone, and prioritization only becomes a discussion
worth structuring once more than one person has a stake in the answer.

---

## 3. What we know vs. what we are assuming

Separating these matters because the plan below is mostly built on the second
column.

| Claim | Basis | Confidence |
|---|---|---|
| Incumbents do not offer a decision log | Reviewed Productboard, Airfocus, Jira Product Discovery feature docs | High |
| Decision-log tools fail on maintenance burden | Multiple independent industry write-ups agree on the cause | Medium-high |
| A competitor occupies this positioning | IdeaLift markets "decision intelligence," captures from 13+ chat channels, publishes to Jira/Linear/GitHub | High |
| Paid acquisition is not viable at our price | B2B SaaS non-brand CPC $8.50–14.00; PPC averages $341/customer. At $39/mo and 12-month retention, LTV:CAC ≈ 1.4:1 against a 3:1 threshold | High |
| PMs feel this as a top-three pain | **None. Zero customer conversations have occurred.** | **Unvalidated** |
| Teams want prioritization to be defensible rather than fast | **None. Every stage in §8 depends on this being true.** | **Unvalidated** |

The last two rows are the risk. Everything downstream depends on them and
neither has been tested. §5 covers how they get tested.

---

## 4. Target customer

A product lead on a team of five to thirty people, where prioritization is
genuinely contested and no one has the authority to mandate a process for
resolving it.

Team size is doing specific work here. Past roughly a hundred people,
organizations often have a product-ops function — someone whose job is
standardizing how these decisions get made, with a required template and a
review cadence. Where that role exists, adoption is a decision made by
whoever holds it. That is a sales motion, and it is the one this plan
explicitly avoids (§7).

Below that size, nothing enforces a process. If people do not like the
spreadsheet, no one makes them use it, so prioritization gets argued out
informally in Slack threads and standups instead. Stage 1 in §8 is built for
that specific gap.

"Contested" matters as much as team size. A single founder just decides;
there is no argument to capture. A large enterprise resolves priority
through hierarchy and procurement more than open argument, which mostly
routes around what this product does. The target is the middle: more than
one person with a real say, and no structural authority settling it for
them.

---

## 5. Validation plan

The two unvalidated rows in §3 gate everything from §8 onward. Before more
of that roadmap gets built, both need direct evidence, not more analysis.

This is not a survey. Stated intent is unreliable — nearly everyone agrees a
demo sounds useful. The method is a real conversation: post something worth
responding to where PMs already are, then follow up with anyone who engages.

Draft outreach, ready to post as-is. First person, no claimed professional
history, consistent with the About page rewrite:

> I've been building a prioritization tool, which means staring at a lot of
> RICE scores. The thing I keep getting stuck on: three of those four
> numbers are openly judgment calls, but reach is supposed to be the
> measurement. From what I can tell it's the one people most often just
> make up.
>
> Maybe that's fine in practice? But reach is the only unbounded one.
> Impact sits on a fixed ladder, nobody writes confidence above 90. Reach
> you can double and nobody blinks, and the whole ranking moves with it.
>
> Is this a real problem, or am I overthinking a number that mostly works
> out?

Where to post: r/ProductManagement, the Lenny's Newsletter community, Mind
the Product's Slack, LinkedIn (posted directly, not as a link out), and
existing network first.

What counts as engagement: a reply that agrees or disagrees with a
specific claim, a DM, or someone volunteering their own example. A generic
positive comment does not count.

Timeline: 30 days, matching Goal 2 below. Track replies against the
five-of-twenty threshold in §10.

Output: the Confidence column in §3 moves from Unvalidated to Confirmed or
Refuted, with the evidence noted next to it. This step runs manually — it
depends on real conversations under Kristen's own identity and cannot be
delegated or automated.

---

## 6. Goals

1. Reach 25 teams running at least two prioritization decisions per month
   within 90 days.
2. Validate or kill the two unvalidated assumptions in §3, per the plan in §5,
   within 30 days.
3. Establish a monetization path that does not depend on paid acquisition.

## 7. Non-goals

Explicitly out of scope for the next two quarters. Each is a plausible adjacent
market that would consume the roadmap without serving the goals above.

| Not doing | Rationale |
|---|---|
| Roadmapping | Productboard owns this segment and sells enterprise. Requires a sales motion we do not have. |
| Feedback aggregation | Canny and BuildBetter are established. Different job: input to a decision, not the decision. |
| General-purpose decision logging | IdeaLift's positioning. Broader scope, and the breadth removes the quantitative model that differentiates us. |
| Work tracking | Jira and Linear hold the work. A second backlog is an immediate rejection. |
| Enterprise sales | 6–18 month cycles, SOC 2 (~$20–50K and several months), security review. Incompatible with the 90-day goal and with a single-person team. |
| Microsoft Teams integration | Teams admin policy allows orgs to disable user app installation, which blocks self-serve adoption. Requires the top-down motion above. |

---

## 8. Proposal

Three stages. Each depends on the output of the previous one.

### Stage 1 — Capture (0–3 months)

Make Tarazu invocable from inside the discussion where prioritization is
actually argued. Slack first: a user invokes Tarazu on a thread, selects the
candidate items, and Tarazu drafts scores using the thread as context, runs the
analysis, and posts a decision summary back to the channel.

Rationale for Slack over alternatives:

- Product teams of 5–30 people skew heavily to Slack.
- The Slack API (Bolt SDK, Block Kit) is substantially cheaper to build against
  than the Teams stack (Bot Framework, Adaptive Cards, Azure AD registration).
- A summary posted to a shared channel is seen by everyone in it. Given that
  paid acquisition is closed to us (§3), a format with built-in visibility is
  the only growth mechanism available.

**Output:** decision volume, and organic exposure per decision.

### Stage 2 — Record (3–9 months)

Every captured decision becomes a permanent, retrievable record: the ranking,
what it beat, the margin, the participants, and the stated reason. Records
accumulate as a by-product of Stage 1 rather than through separate data entry,
which addresses the maintenance failure identified in §2.

Per-person attribution is required, not optional. A record that cannot identify
who supplied a given estimate and who revised it does not support the review use
case that justifies the feature. Clerk already provides identity, and the
`feature_timestamps_and_revision_snapshots` migration already captures
revisions; the gap is surfacing this history, not storing it.

**Output:** a corpus of decisions paired with their stated reasoning.

### Stage 3 — Calibrate (9–18 months)

With sufficient recorded decisions and their outcomes, report on estimate
quality: whether a team's reach figures are systematically high, whether their
confidence scores correlate with anything, whether top-ranked items ship on the
timelines assumed.

This is the only piece that is genuinely difficult to copy. It depends on the
accumulated data that Stages 1 and 2 produce, so it cannot be built on demand.
Outcome capture needs to be instrumented starting in Stage 2, well before it
pays off.

**Output:** a capability no competitor currently offers, which is what makes it
a switching cost.

---

## 9. Alternatives considered

**Stay a single-player scoring tool.** Free spreadsheet and Notion templates
already do this adequately — the six months with no paying users is consistent
with that. Rejected.

**Reposition on "decision intelligence."** IdeaLift already holds this
positioning, with a stronger capture mechanism (automatic, from chat) and more
distribution behind it. Competing for a category term against better-funded
distribution is not where a single-person team should spend the next quarter.
Rejected.

**Target enterprise directly.** Probably the largest prize on this list — the
pain is likely more acute at scale, and willingness to pay is 10 to 50 times
higher. It is also incompatible with the 90-day goal: the sales cycle alone runs
longer than that, and the self-serve distribution mechanism in Stage 1 does not
function inside admin-controlled workspaces. Bottom-up first, with the product
kept enterprise-compatible (per-user identity, audit history, row-level
security, data export) so the option stays open. Revisit in year two.

**Build the feedback-tool integration first.** Pulling reach data from Canny or
Productboard would replace the most frequently invented input in the model with
a measured one — probably the single highest-value integration available. It
does not solve distribution, though, which is the actual constraint right now.
Deferred to Stage 2, not dropped.

---

## 10. Success metrics and kill criteria

Thresholds set before data collection.

| Hypothesis | Metric | Threshold | Action if missed |
|---|---|---|---|
| The pain is real | Teams engaging after direct outreach | ≥5 of 20 approached | Stop. Reconsider problem. |
| This is a workflow, not a novelty | Decisions per team, first 30 days | ≥2 | Stop. |
| Distribution mechanism works | Decision summaries receiving in-channel replies | ≥30% | Growth model invalid. Revisit GTM. |
| Records are consulted | Past records reopened | Any, by month 3 | Stages 2 and 3 are invalid. Product is a scoring tool. |
| Defensibility beats speed | Week-6 retention | >40% | Core assumption in §3 is wrong. |

Row 4 should be instrumented first. It is inexpensive to measure and Stages 2
and 3 both depend on it.

---

## 11. Risks and open questions

**R1 — The core assumption may be wrong.** Some teams want prioritization to be
fast, not defensible. For those teams, structure applied during a discussion is
friction. If they are the majority, the addressable market is materially smaller
than assumed. Mitigation: metric 5 above, and 20 customer conversations before
any significant build.

**R2 — Thread parsing quality.** Extracting clean candidates from an unstructured
40-message discussion is difficult, and a poor first result is likely to end the
trial. Mitigation: do not attempt full automation. Let the user select the
relevant messages or enter candidates directly, and use the thread only as
scoring context. The existing `/api/suggest-scores` endpoint already implements
this shape.

**R3 — Cold start.** A decision record has no value in the first session and
accrues over months, which is the inverse of the current product's 60-second
value delivery. Free tier must carry immediate value; paid tier carries the
compounding value.

**R4 — Single-person team.** No engineering redundancy, no design, no sales.
Sequencing assumes one person and the plan should not be read as achievable
faster with more hands, since the binding constraint is customer evidence rather
than build capacity.

**R5 — Unbounded API cost. Resolved 2026-08-20, before outreach began.** A
50-call/day/user quota now gates both AI endpoints, enforced server-side via
`ai_call_log` (`supabase/migrations/20260820210000_ai_call_quota.sql`), fails
closed if usage can't be verified. Left in as the record of why this mattered:
authenticated users had no volume limit on LLM calls, a cost exposure that
would have scaled directly with any marketing success, and the two tables
that looked like they already covered this (`ai_score_events`,
`ai_analysis_events`) didn't — both are written client-side, after the fact,
not server-side at call time.

### Open questions

1. Which single tracker integration is disqualifying if absent — Linear or Jira?
2. Is the buyer the individual PM or the team? This determines whether Pro or
   Team is the first real tier, and the current build order assumes Pro.
3. Does the existing SEO traffic (`/vs/spreadsheets`, `/frameworks/rice`)
   convert better than decision-record positioning? Both should run before
   either is removed.
4. What is the minimum viable outcome-capture mechanism for Stage 3, and can it
   be instrumented without asking users to report outcomes manually?
