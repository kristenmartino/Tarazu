# Context sensitivity evaluation

These paired fixtures are synthetic, not customer research. They have not been run against a live model.

In an authorized environment with a configured API key, merge each pair's A/B fields into `candidate` and POST each body to `/api/suggest-scores`. Run each pair three times; keep model ID, full responses, and context snapshots. Do not commit credentials.

Review:
- Strategy: does the rationale address the changed target user and metric, rather than universally endorsing bulk invite?
- Capacity: does effort reasoning reflect the service and staffing constraints? Does it avoid treating unavailability as proof of low customer value?
- Evidence: are missing evidence and synthetic supporting/conflicting signals represented accurately? Are evidence references real? Is confidence tied to supplied evidence rather than phrasing or score acceptance?
- Across pairs: are unknown dimensions left null when unjustified, assumptions explicit, and next actions specific? Changed context need not produce changed numbers if the dimension is unaffected. Numbers alone are not an evaluation of product judgment.

Deterministic tests verify context plumbing, schema validation, and interaction behavior only. A live evaluation is needed before claiming improved model judgment.
