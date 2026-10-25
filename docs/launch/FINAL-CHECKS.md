# Final mobile and sharing checks

Checked October 25, 2026 against production release `87f3698af1e7665730e136e91413a961b6f86152`, before the social-description and launch-material update in this change. This is a dated verification record, not a standing guarantee. No launch was scheduled or posted.

## Results

| Check | Result and boundary |
| --- | --- |
| Hosted mobile regression | 18 passed: nine focused cases in Chromium/Pixel 7 and WebKit/iPhone 13 emulation. Tests exercise 320px and 390px layouts where specified. |
| Mobile functionality | Brief save/reopen; decision brief clipboard fallback; dated review preservation/reopen; retirement reminder; RICE input readability; four-step story; action above bottom navigation; personal-work handoff; contact/export explanation. |
| Real hosted sign-in entry | Four additional checks passed across the same two engines: a signed-out visitor reaches Clerk's Google/email form with `start=decision`, and homepage → demo → contact links work. No credentials were submitted. |
| Manual visual check | Live 390px guest walkthrough and saved decision inspected; brief copy reported success; review form opened and cancelled. Automated WebKit review and personal-candidate screenshots inspected. |
| Public share metadata | Homepage, demo, case study, pricing, privacy and contact returned HTTP 200 to a LinkedInBot request. All six included Open Graph/Twitter titles, descriptions and image URLs. The demo retained `noindex, follow`. |
| Social image | Public PNG downloaded and visually inspected at 1200 × 630. Text and scale artwork fit. |
| Actual LinkedIn preview | Homepage and demo preview titles and images rendered in Post Inspector. The demo produced no ingestion warning. The homepage produced a warning that its short social description was under 100 characters. |
| Sharing correction | Removed the homepage's short social override so it uses the existing full product description. This changes share metadata, not the visible homepage or walkthrough. After deployment, refresh the homepage in Post Inspector and verify the warning is gone before scheduling. |
| Hosted video and Product Hunt | The Unlisted Tarazu video URL was saved in the draft, embedded playback advanced with `paused=false`, and the URL persisted after save/exit/reopen earlier on October 25. Product Hunt marked Video or demo Complete; five gallery images remained. |
| Earlier launch rehearsal | Fresh Google sign-in, a live AI response, cloud brief save/reopen after reload and actual assigned-issue notification email receipt passed on the same production release. They were not repeated merely for this copy change. |

The first temporary browser-run filter also selected local-only cases because its project names contained the word `mobile`. That run was stopped and its selection corrected. The 18-pass result above is the completed focused run, not a claim that the initial run passed or that local no-auth cases work unchanged against hosted Clerk.

## Limits

- Chromium/WebKit emulation is not a physical iPhone/Android test or a native iOS Safari test. No physical handset check was performed in this session.
- No new paid AI call, cloud workspace mutation, public social post or email was needed for these checks. Clipboard denial was simulated in the regression case; manual copying was also checked in the connected browser.
- The sign-in-entry checks prove the form and destination, not another completed login. The earlier authenticated rehearsal supplies the separate cloud/AI evidence.
- LinkedIn's inspector verifies its current scraped card; other sharing apps can maintain their own caches or choose different presentation. A `noindex` demo may still be shared; it does not publish a visitor's browser data.
- Contact links were checked as email draft links. They do not prove delivery to the support mailbox. The earlier operational alert email receipt is a different check.
- Health checks and conservative spending limits do not prove capacity for a Product Hunt traffic spike.

## Release and scheduling gate

Run the launch-kit check, the metadata/route checks and required hosted CI before merging. After deployment, confirm the new release is healthy, the public ZIP matches the local checked ZIP, and LinkedIn's homepage preview uses the full description without the previous warning. Media captures need not be rebuilt for a metadata-only change.

Scheduling still needs Kristen's chosen date and coverage windows. Use [RESPONSE-PLAN.md](RESPONSE-PLAN.md) and adapt [FAQ.md](FAQ.md) before posting replies. The Product Hunt draft is separate from a scheduled or public launch. Optional company information and shoutouts are not technical blockers.
