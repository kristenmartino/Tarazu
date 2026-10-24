# Context sensitivity evaluation

These paired fixtures are synthetic, not customer research. They have not been run against a live model.

In an authorized environment with a configured API key, merge each pair's A/B fields into `candidate` and POST each body to `/api/suggest-scores`. Run each pair three times; keep model ID, full responses, and context snapshots. Do not commit credentials.

Review:
- Strategy: does the rationale address the changed target user and metric, rather than universally endorsing bulk invite?
- Capacity: does effort reasoning reflect the service and staffing constraints? Does it avoid treating unavailability as proof of low customer value?
- Evidence: are missing evidence and synthetic supporting/conflicting signals represented accurately? Are evidence references real? Is confidence tied to supplied evidence rather than phrasing or score acceptance?
- Across pairs: are unknown dimensions left null when unjustified, assumptions explicit, and next actions specific? Changed context need not produce changed numbers if the dimension is unaffected. Numbers alone are not an evaluation of product judgment.

Deterministic tests verify context plumbing, schema validation, and interaction behavior only. A live evaluation is needed before claiming improved model judgment.

## Product-demo readiness check, October 23, 2026

A separate browser-based sanity check uses the fictional Relay scenario described in `../product-demo-walkthrough.txt`. It covers missing information, supporting and conflicting Signals, changed capacity, changed strategy, and the live backlog advisor. It is not the repeated paired-fixture evaluation above and does not establish general model quality or customer validation.

The check found a full-context timeout, a schema-rejected response, and one incorrect assessed/unassessed count. The fixes allow more response time, request compact reasoning, give repair attempts field-specific validation feedback, and supply exact saved-brief assessment counts. Human review remains required; existing scores change only after explicit acceptance.

The strategy rerun returned a valid, context-sensitive response, and the compact four-score request completed. The counting mistake recurred in generated prose despite the structured counts. Prompt instructions alone did not fix it.

The follow-up fix makes completion counts application-owned: exact saved-brief counts appear beside AI results, separately for each decision snapshot. Both AI response schemas reject assessment narration (including the numeric and spelled-out mistakes observed in the live check), request one repair, and return no model result if repair fails. The model explains specific evidence gaps qualitatively instead. Regression tests cover nested reasons, assumptions, gaps, next actions, correct counts also being excluded from prose, and preservation of ordinary sample sizes and estimates. This guard is scoped to assessment language; it is not a general factual-accuracy guarantee or proof of improved model judgment.

## Advisor reliability follow-up

The first advisor request after that deployment returned 502 after 27.80 seconds and two provider calls, then a separate run succeeded. The old deployment did not retain stop reasons or validation paths, so the exact historical rejection cannot be recovered. Do not describe its cause as proven.

Confirmed failure paths in the code were: a 1,000-token output cap reused on repair even after truncation; a timeout covering only headers; API and validation failures replaced with local demo recommendations; and successful results discarded if feedback logging threw. Regenerate also cleared the result instead of starting the next request.

The advisor now requests compact output with a 2,400-token initial budget and 60-second per-attempt deadline covering the response body. A provider `max_tokens` stop triggers one regeneration at twice the budget; both JSON/schema validation and the assessment guard still apply. This follows [Anthropic's stop-reason guidance](https://platform.claude.com/docs/en/build-with-claude/handling-stop-reasons). The maximum remains two provider attempts within a 180-second route budget. Server diagnostics record attempt number, model, budget, stop reason, output-token usage, outcome, and failing paths, with no prompt or generated text. UI failures show the returned error, record a failed event, and cannot create a substitute recommendation or decision draft. Feedback logging is best effort; regeneration starts with one click.

## Current demonstration and verification boundaries, October 23, 2026

Later live browser checks returned valid four-input suggestions for the fictional Relay candidate and a valid advisor recommendation to investigate readiness before building reminders. These are individual sanity checks, not the repeated paired runs above. The earlier failures remain documented as historical observations; successful reruns do not establish a general error rate or improved product judgment.

Before this scoring-units change, the deployed main commit `f5af2050ec9e13443c7885bbc160d8d549b7c921` passed 856 deterministic unit tests and 31 hosted browser cases. Mutation checks scored 91.45% against the existing 90% threshold. Those results describe that commit, not AI accuracy or subsequent code. The current change's verification is reported with its PR checks.

The demo narrative now distinguishes current calibrated scores from frozen historical decision snapshots, and a paper discovery exercise from software pilots. Current bands are explained by an explicitly selected existing claim reference, not numbers extracted from prose. Neither selecting a basis claim nor a reported-fact label verifies its truth. A matching source excerpt is also not proof that it entails the claim. No synthetic source establishes real customer confidence.

## Answered-question follow-up review

The October 23 live scoring check repeated a recorded unknown: it changed “what share of 100 users” into “how many of 100 users” over the same 30-day period. The old UI matcher only recognized punctuation and auxiliary-word changes. Prompt instructions alone did not prevent the paraphrase. Another proposed question asked for a case breakdown already present in a supplied Signal.

The scoring route now separately reviews proposed follow-ups and next actions against the current candidate's supplied answers, shared context and Signals. Exact recorded questions retain a deterministic shortcut. The semantic review distinguishes supplied information (including estimates, fiction and explicit unknowns) from new audience, denominator, timing, outcome or scope questions. An acknowledgement must cite an available source with an exact answer-text excerpt; the app removes the repeated editor and shows that excerpt with its original uncertainty. It does not change scores, claims, sources or saved answers, and it does not treat an excerpt as independently verified evidence.

Generation and repair share a 25-second review deadline within the existing 180-second route budget (two 75-second scoring attempts plus 25 seconds for review). A live demo check reached the safe fallback for every dimension under the original ten-second per-attempt limit; this is not evidence that the questions were answered. Unavailable reviews log only an error category, never context or model output. When review is unavailable or ambiguous, the app withholds the unchecked question, explains that it needs review, and retains valid scores (including null). It does not retry or replace the scoring result. This adds a small review request when answer context is supplied. Semantic classification can still be wrong; deterministic tests prove boundaries and UI behavior, while live checks are individual sanity checks rather than a general accuracy benchmark.

## Research actions after an answered question

A later live result acknowledged that an eligible-user measurement did not exist,
but still recommended asking ops for that same historical count. The acknowledgement
worked; the next action did not clearly describe how to obtain new evidence.

The scoring prompt now requests a proposed collection method and measure. The same
bounded question review returns separate research wording for each new next action;
the application labels it “Suggested research” rather than reusing the original
question. A new action without this wording is rejected by the review schema and
withheld if bounded repair fails. Conditional record review or prospective measurement
can fill an explicitly unavailable baseline; a larger sample review can add evidence
without erasing the known sample. These are proposed methods, not collected results.
Acknowledgements, new follow-up questions, original uncertainty and manual acceptance
remain separate. Tests cover the observed ask-ops wording and missing research steps;
they do not establish the quality or feasibility of every model-generated method.
