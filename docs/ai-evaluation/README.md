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
