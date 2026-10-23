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
