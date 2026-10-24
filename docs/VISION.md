# Tarazu: Product Vision

**Status:** Product and business hypotheses under review. The working demo is
not evidence of customer demand or measured customer outcomes.
**Owner:** Kristen Martino
**Updated:** October 23, 2026
**Review basis:** Current repository implementation and the fictional Relay demo.
This update is not a fresh customer, revenue, traffic or production-database audit.

## Purpose

Help a person making a product decision compare options, inspect the evidence
and assumptions behind them, choose a useful next test, and return to the
reasoning when new information arrives.

The proposed value is less time reconstructing a decision and a clearer basis
for changing course. Time saved, better decisions and willingness to pay still
need to be demonstrated with real users.

## The problem to test

Product decisions can combine observations, forecasts, missing information and
personal judgment. A ranked list alone can hide those differences. When evidence
changes, a team may struggle to explain why it chose one option or whether the
original reasoning still applies.

These are problem hypotheses for discovery, not findings from the synthetic
demo. Ask reviewers about a recent real decision and their existing process
before treating this problem as important to them.

## Initial audience and buyer hypotheses

The primary review audience is a product lead or practitioner in a small team
who has competing options, some customer or operational evidence, and a real
choice about what to test or build next. This is a proposed starting audience,
not a validated market segment or a requirement for a particular team size.

A founder with a shipped prototype and active customer feedback is an adjacent
hypothesis to test separately. Neither the smallest team nor the largest
organization should be assumed to have the same workflow or buying process.

The user, beneficiary and buyer may differ. Whether an individual, team lead
or organization would pay is unresolved. Existing spreadsheets, notes and
product tools are the practical alternatives to understand in interviews;
this document makes no current competitor feature or price claims.

## What works today

The following describes the current implementation and prepared demo, not
customer adoption or commercial readiness.

| Capability | Current behaviour and boundary |
| --- | --- |
| Shared scoring context | Strategy Brief fields, audience, scoring period, target outcome and shared anchors supply context for comparing candidates. |
| Candidate scoring | Reach, impact, confidence and effort use 1–100 bands. The resulting RICE adaptation is a relative prioritization index, not ROI, measured return or a success probability. Scope and human judgment affect rankings. |
| Claims and Signals | Recorded claims distinguish reported facts, user estimates and AI assumptions. Sources can support, conflict with or provide context for a claim. Labels and matching excerpts do not independently verify truth. |
| AI assistance | Signed-in requests use supplied context to draft scores and reasoning. Unknowns can stay null. The user explicitly accepts suggestions; context changes block accepting stale results. AI can still misinterpret evidence. |
| Questions and research | Supplied answers, including explicit unknowns, can be acknowledged with source excerpts. New research steps describe a proposed collection method and measure; they are not observations or completed work. Ambiguous or unavailable review withholds unchecked output. |
| Validation briefs | Investigations can be saved, reopened and revised independently of decisions, including unassessed areas and reviewed evidence. Partial ratings or weak evidence do not establish customer validation. |
| Decisions | Draft decisions can preserve the originating brief revision, sources and reasoning. Revising a brief does not rewrite an earlier decision snapshot. A saved draft is not an approved build or an observed outcome. |
| Persistence and identity | Guest work stays in the current browser. Signed-in work uses workspace-scoped cloud storage, with personal and organization access paths. Revision and decision records include creator attribution where implemented. The prepared cloud demo contains synthetic records. |
| Review records | Score edits and recommendation feedback can be reviewed. These records are not automatic model training or a system that learns from shipped outcomes. |

AI requires sign-in, network access and server-side usage checks. Provider or
validation failures display an explicit error; the app does not invent a local
substitute recommendation. Automated tests verify software behaviour, and live
AI checks are individual sanity checks rather than a general accuracy benchmark.

## What the demo demonstrates

Relay is a fictional approval workflow with three options: reminders, a status
dashboard and a request-readiness checklist. Its users, interviews, case reviews,
baselines and forecasts are synthetic.

The walkthrough starts with a reminder hypothesis. Conflicting case notes suggest
missing information could be another cause of delay. The team proposes a smaller
readiness experiment, records the reasoning and reopens it later.

This demonstrates how to inspect and revisit a decision. It does not demonstrate
that a checklist works, that reminders fail, or that any customer obtained a
business benefit. Current calibrated rankings and older frozen decision scores
reflect different scopes and judgments; evidence alone did not mathematically
cause a reranking.

Use [the product-demo walkthrough](product-demo-walkthrough.txt) for the prepared
sequence and [AI evaluation notes](ai-evaluation/README.md) for verification limits.

## Business state and open questions

The current public offering is Free. Pro, Team and Enterprise tiers are labelled
Planned and are not available to purchase. The public promise that existing free
functionality stays free constrains future paid packaging; any paid proposal
must identify additional value or clearly separate a service from software.

There is no newly verified customer count, revenue, retention, acquisition cost,
traffic level or willingness-to-pay result in this update. The prepared signed-in demo
contains saved synthetic records; these demonstrate persistence and do not
establish customer adoption. Historical counts and market
estimates must not be substituted for a fresh business audit.

Questions for review:

- Which real decision would make someone return with new evidence?
- Is preserving reasoning useful enough to justify entering and maintaining it?
- Who needs to read the decision, and who could authorize payment?
- What does the existing workflow already do well, and what would Tarazu add?
- What support effort, AI usage and infrastructure cost would a repeat workflow require?
- What evidence would justify a paid offering without contradicting the free promise?

## Next milestone: observed use

Run a small set of relevant product, design and business feedback sessions with
the current workflow. Start with a recent real decision, then ask the participant
to find conflicting evidence, choose a next test and reopen the reasoning with
minimal coaching. Keep their actual observations separate from interpretation.

Record task completion, assistance needed, confusing wording, whether the decision
or next action became clearer, and a voluntary return with new evidence. A useful
next milestone is repeated evidence-to-decision use with little assistance.
Compliments, one synthetic walkthrough and technical test counts do not establish
that milestone. Agree on pilot success criteria before evaluating the results.

Use product reviews to test decision usefulness; design reviews to observe
comprehension and effort; business reviews to test recurring need, buyer and
packaging hypotheses. A reviewer is not automatically a prospective customer.

## Priorities and limits

1. Keep the demonstrated workflow understandable, reviewable and reliable.
2. Observe first-time use and a return visit before expanding scope.
3. Prioritize a change when a specific observed obstacle prevents the next useful decision.

Slack capture, tracker integrations, autonomous research, additional roadmap
features, automated outcome collection and model calibration are possible future
work. They are not implemented promises or a committed sequence. No automatic
learning or improvement in decision quality is claimed. Keep execution tracking
outside Tarazu unless observed user needs justify changing that boundary.

Personal and organization workspaces remain supported. A historical proposal to
remove the personal path is not migration cleanup or an approved product decision.
Any future change to ownership, access or retention needs its own explicit scope.

## History

The [archived August planning draft](history/VISION-2026-08.md) preserves earlier
assumptions, comparisons, dated metrics and a Slack-first proposal. It is retained
for context, not as a current factual source or roadmap commitment.
