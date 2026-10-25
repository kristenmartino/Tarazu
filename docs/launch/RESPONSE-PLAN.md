# Tarazu launch-day response plan

Owner: Kristen Martino. Prepared October 25, 2026. This is an operating plan, not a scheduled launch, promised support SLA or authorization to send messages. No launch date has been selected.

## Before scheduling

- Review the saved Product Hunt draft: product URL, five screenshots, full YouTube URL, maker comment, pricing and tags. Preview video playback. Company information and shoutouts are optional; add only accurate information.
- Choose a date when Kristen can cover the launch and specify coverage in America/New_York. Confirm the actual date/time shown by Product Hunt before scheduling; do not infer it from the computer's timezone.
- Have three first-time visitors try the demo and start an own decision without coaching. Record where they get stuck and fix completion blockers. This is user feedback, separate from automated or maker-led rehearsal.
- Check the [verification record](FINAL-CHECKS.md). Repeat affected checks after any product release. A green health endpoint alone does not prove sign-in, a paid AI call or saved cloud data works.
- Keep [FAQ replies](FAQ.md), [operations](OPERATIONS.md), the support inbox and [GitHub monitoring runs](https://github.com/kristenmartino/Tarazu/actions/workflows/launch-monitor.yml) available. Confirm the contact inbox is being watched; link checks do not establish mailbox delivery.

## Coverage to reserve

| Window | Action |
| --- | --- |
| Day before | Review public copy and draft; check the guest flow, mobile navigation, media and sign-in destination. Preserve the known-good deployment. Avoid unrelated releases. |
| One hour before | Read production health and the latest successful normal monitor run. Confirm an earlier actual sign-in/AI/cloud/email rehearsal still applies to the current release. Rerun it if relevant configuration or behavior changed, using synthetic scratch data. |
| First two hours | Stay available for comments, support and alerts. Check health, capacity warnings and the support inbox about every 30 minutes while actively covering the launch. |
| Rest of launch day | Reserve named check-in windows around Kristen's availability. Answer substantive questions, record issues and revisit unresolved reports. Do not promise continuous coverage. |
| Following day | Review failures and useful conversations. Follow up only with people who requested or agreed to it. Summarize what changed, what remains unknown and the next test. |

## How to respond

Answer the person's question first, then offer one useful next step. Adapt the FAQ rather than pasting the same sales paragraph repeatedly. Thank people for concrete criticism without arguing about their experience. Share the launch link where relevant and ask for feedback, never upvotes, reciprocal votes or incentives.

Suggested replies, to use only when the statements are true:

| Situation | Suggested response |
| --- | --- |
| Confused about the product | "Tarazu keeps a product choice, the evidence behind it and its later reviews together. The Relay example takes you through one fictional choice. What decision are you trying to make?" |
| Spreadsheet comparison | "If you only need a ranked list, a spreadsheet may be enough. I built Tarazu to preserve why a choice was made and revisit it with new evidence. Where does your current process lose that context?" |
| AI output challenged | "The suggestion needs review; its score is not a measured result. Which source or assumption seems wrong? Please leave private material out of this thread." |
| AI temporarily limited | "AI is temporarily unavailable within early-access limits. You can continue with manual scores and saved records. I will update this thread after checking the service status." |
| Reproducible defect | "I can reproduce this in [browser/page]. The affected action is [action]. [Verified workaround, if any.] I am investigating and will report back after checking a fix." |
| Cannot reproduce | "I haven't reproduced it yet. Could you share your browser, page and the steps immediately before it happened? Please use the contact page for anything private." |
| Feature request | "What would this help you decide or do next, and how are you handling it today? I will record the need; I haven't committed to a delivery date." |
| Fix deployed | "The fix is live, and I verified [specific action] in [browser]. Please let me know if you still see the problem." |

Do not say an issue is fixed when only a local change, passing test or preview exists. Do not claim a user's data is safe or recovered without evidence. Do not ask people to clear storage as a generic workaround: it can delete guest work.

## Triage and response ownership

| Priority | Examples | Next step |
| --- | --- | --- |
| Stop/hold launch | Wrong-account access, data loss, broad sign-in/save failure, site outage, broken core demo | Hold scheduling or promotion. Verify scope, preserve relevant diagnostics privately and follow the operations recovery steps. Do not delete production records to repair a presentation. |
| Investigate promptly during coverage | Broken mobile action, reproducible brief/review problem, repeated AI failures, blocked contact path | Reproduce with synthetic data, record browser/steps, provide a verified workaround when available, fix and retest the affected flow. |
| Record and group | Copy confusion, minor layout problems, feature requests | Record the problem and impact, look for repeats and prioritize after core failures. |

Record each report in the existing issue tracker with a short title, page, browser, expected/actual behavior, reproducibility, affected scope, owner, next update and verification. Ask before transferring a person's private material to an issue. Public reports should contain synthetic reproductions, not account identifiers or research notes. Manual support triage is separate from automatically created health incidents.

## Capacity, alerts and recovery

Retain the approved $10 rolling-24-hour spending envelope and current quotas. Capacity warnings do not authorize increasing the budget. The present policy allows three shared concurrent requests and 100 shared requests per rolling 24 hours; check `/api/health` for effective values. Do not claim a traffic load test or guaranteed visitor capacity from these limits.

Use [OPERATIONS.md](OPERATIONS.md) for AI pause, investigation, rollback and recovery verification. Scheduled GitHub monitoring is best effort and cannot report its own disabled scheduler. Check its most recent successful run as well as the public endpoint. Actual notification-email delivery was verified during the earlier synthetic rehearsal; repeat the delivery test if routing/settings change or delivery is in doubt.

## Learning record

Proposed goal: five relevant product conversations and two people willing to try a real decision and return with new evidence. These are targets, not achieved results. Record consented observations of tasks completed, help required, issues and intended next review. Optional aggregate event counts measure actions, not unique people, accepted AI output or retention. Keep opt-out controls intact and do not join anonymous counters to accounts.
