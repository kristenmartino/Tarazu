# Tarazu launch operations

Owner: Kristen Martino. Production: https://tarazu.app. No Product Hunt submission is made by this release.

## Capacity and budget

The application keeps its current effective request limits: default 50 per account, 100 shared in a rolling 24 hours, one active request per account, three shared, five seconds between requests. Server environment overrides remain supported. `/api/health` reports the deployed effective limits and model IDs, never credentials or customer counts. A deployment with unreviewed model pricing reports unhealthy and blocks provider calls.

The owner approved **up to $10/day**. `ai_operations_policy` enforces a maximum $10 conservative spending envelope in a rolling 24-hour window. Each Anthropic Messages call, including repairs and semantic reviews, reserves separately under a transaction lock before contacting the provider. Failed calls and uncertain responses retain reservations. The estimate uses UTF-8 message bytes plus 4,096 overhead as an upper token estimate, maximum output tokens, and twice the standard published rate. Current reviewed models: Opus 4.8 ($5/$25 per million input/output tokens) and Sonnet 4.6 ($3/$15), checked against [Anthropic pricing](https://platform.claude.com/docs/en/about-claude/pricing) on October 24, 2026. No tools, prompt caching, thinking, fast mode or priority tier is sent. Context over 150,000 serialized UTF-8 bytes and output over 16,000 tokens are refused. Do not add model aliases or new paid options without updating the reviewed envelope and tests.

This is a deliberately conservative admission budget, **not a copy of the provider invoice**. Actual billed usage can be lower; unused reservations are not refunded. It covers calls through Tarazu after this release, not other apps sharing the key, previous calls, taxes or hosting. Retain the provider's account-level spending controls and review the provider console during launch. Do not increase the $10 database ceiling without a new owner-approved budget. Request quotas are additional bounds and do not guarantee a number of completed AI results.

## Health and alert delivery

`Launch health and alerts` runs on GitHub at minute 7, 22, 37 and 52 each hour and can be dispatched manually. GitHub schedules are best effort, not a 15-minute availability SLA. It checks production health, demo/privacy/contact availability and retention cleanup. Health reports configuration/database failures, AI pause, 80% of the configured shared request allowance, 80% of the reserved spend budget, and at least three failures representing at least half the last 15 minutes' requests. It does not spend money calling the model merely to check uptime, and cannot prove the provider credentials/credits work without a real request.

The workflow opens one deduplicated incident assigned to `kristenmartino`, comments when categories change and closes it after recovery. It uses the repository's built-in token with contents read and issues write. Incidents contain fixed operational categories and a workflow link, never customer content, identities or raw error text. GitHub account settings must enable Email and On GitHub for participating/assigned conversations. The account's existing notification destination is used; no separate email provider is added. Failed Actions emails are an additional channel. If issue creation itself fails, the workflow fails visibly. Monitor its last successful run on launch day; a disabled scheduler cannot report its own silence.

For a delivery check, dispatch with `test_delivery=true`. This creates and closes a clearly labelled TEST incident, without claiming a real outage. Verify both the assigned GitHub issue and the actual notification email. The test is distinct from normal health monitoring and does not prove all checks are healthy.

## Triage, pause and recovery

1. Open the linked run and inspect the fixed categories. Check `/api/health` and the deployment status. Do not paste customer records or credentials into an issue.
2. For spending warnings, leave the existing ceiling in place; manual workflows remain available. For provider errors, inspect Vercel/Anthropic status and a relevant safe route diagnostic. A normal shared limit can resolve as the rolling window expires.
3. For immediate AI pause, use an authorized Supabase SQL session: `update public.ai_operations_policy set enabled=false where id=true;`. This blocks the next provider reservation without a redeploy. Existing calls may finish. Resume only after investigating: set enabled=true. `AI_REQUESTS_ENABLED=false` in Vercel is also supported, but requires a new deployment. Do not disable auth, reservations or database policies as a workaround.
4. For a broken application deploy, promote the previous known-good Vercel production deployment. Database migrations here are additive and compatible with the previous app; keep the new spending/policy records. Remember the older app does not enforce the new monetary guard: pause AI or revert again promptly rather than operating it indefinitely.
5. Dispatch the monitor again after recovery and confirm the incident closes. Review failed Actions and email if GitHub notification delivery is delayed.

## Measurement and retention

Optional product measurement is off until opted in at `/privacy` or Settings. Do Not Track and Global Privacy Control override it. The API accepts exactly a closed event and mode vocabulary, no extra fields, and writes only UTC-day aggregates. No user/session/workspace identifier, full URL, source text or referrer is persisted in the counts. Hosting still receives connection metadata. Vercel Web Analytics and Google Analytics scripts are no longer loaded by the app; optional GA environment values do not activate them.

Events: `demo_opened`, `walkthrough_started`, `personal_started`, `brief_saved`, `brief_reopened`, `ai_completed`, `ai_refused`, `feedback_opened`. Modes: demo, personal, public. AI completion means an HTTP response succeeded, not that a user accepted the output or the output was correct. Feedback opened means a mail draft link was clicked, not sent. Counts are actions, not unique people; opt-outs, blockers, repeat actions and bots affect them. Use observed sessions for user-level completion and return evidence.

Authorized aggregate review: `select day,event,mode,count from public.usage_daily_counts order by day desc,event,mode;`. Do not join these counts to account records. The monitoring job prunes aggregate counts and AI operational ledgers older than 30 days; a missed job delays deletion. It does not prune customer workspace content or promise deletion from provider backups. Failed pruning raises an incident. Verify the public privacy description stays consistent with actual providers and workflows.
