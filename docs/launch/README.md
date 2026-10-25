# Tarazu launch kit

Positioning: **Make a product decision you can explain — and revisit when the evidence changes.**

These are draft launch materials, not a submitted or scheduled Product Hunt launch or a published LinkedIn post.

## What to use

- `product-hunt-submission.txt`: current tagline, description, maker comment and launch notes.
- `linkedin-featured.txt`: portfolio link and post draft.
- `FAQ.md`: suggested launch-day answers to adapt before posting.
- `thumbnail.png`: square Tarazu mark.
- `01-home.png`: current homepage positioning.
- `02-priorities.png` / `03-signals.png` / `04-brief.png`: scoring, fictional evidence and the saved investigation.
- `05-decisions.png`: the preserved decision and its copy/review controls.
- `06-evidence-digest.png`: Supports, Challenges, Context and Unknowns, relative to the originating candidate.
- `07-copyable-brief.png`: successful copy of a decision brief.
- `08-decision-review.png`: a synthetic review draft with an explicit unknown outcome and revised direction.
- `09-review-history.png`: the dated review alongside the original reasoning.
- `10-mobile-review.png`: the review history at 390px.
- `decision-brief.md`: actual copied output from this isolated synthetic walkthrough, including its dated review and source caveats.
- `tarazu-walkthrough.mp4` and `.vtt`: 96-second walkthrough with eight chapters, burned-in text and matching WebVTT captions.
- `walkthrough.json`: the chapter/caption source.
- `capture.json`: source deployment, capture time and scenario boundaries.
- `manifest.json`: SHA-256 hashes and byte sizes for every packaged file except the manifest itself.

Suggested gallery: homepage → evidence digest → copyable brief → review form → dated history. The other screenshots provide context or a mobile alternative.

For Product Hunt, upload `ph-01-positioning.png` through `ph-05-history.png` in that order. These are 1270 × 760 exports with the complete verified screenshot fitted inside each frame. No source labels or caveats are cropped out. `product-hunt-gallery.json` records the source captures and captions. The square thumbnail remains 240 × 240.

Hosted walkthrough: https://www.youtube.com/watch?v=AgdAIZlUxr8 on Tarazu's `@tarazuapp` channel. It is Unlisted and marked not made for kids. The full URL was saved in the Product Hunt draft and embedded playback verified on October 25, 2026. Product Hunt's video field needs the full hosted URL, rather than the MP4 URL. Recheck playback after replacing the video. Saving a draft does not authorize scheduling or launching it.

The repository also has `docs/launch/RESPONSE-PLAN.md` for coverage and incident handling, and `docs/launch/FINAL-CHECKS.md` for the verification record and remaining scheduling decisions. These internal operating notes are not included in the public ZIP.

The video uses still captures of the actual app, not a live screen recording or a live AI demonstration. All Relay research, people and case reviews are fictional. The additional review is explicitly a synthetic walkthrough exercise: no experiment was run and no customer or business outcome is claimed. Captures use a fresh guest browser; no signed-in workspace is changed and no paid AI call is made. A copied brief is a readable handoff, not a complete workspace backup.

## Rebuild after a relevant product or copy change

Use the repository's Node version from `.nvmrc`, installed dependencies, Python 3, and FFmpeg. Capture from the deployed UI, or run a local production build of the committed UI changes.

```sh
CAPTURE_LAUNCH_ASSETS=1 npx playwright test --config playwright.launch.config.js
node scripts/build-launch-video.mjs
node scripts/build-product-hunt-gallery.mjs
python3 scripts/build-launch-kit.py
python3 scripts/build-launch-kit.py --check
```

Capture defaults to `https://tarazu.app`. For a local production build, set `LAUNCH_BASE_URL` to its loopback URL and start the server with `VERCEL_GIT_COMMIT_SHA` set to the committed UI revision. Local captures do not require cloud/AI configuration; a non-loopback capture requires healthy production services. The capture records the source URL and revision. The capture checks that the release is unchanged across the run. Each run starts with isolated browser storage and verifies the original decision is unchanged after the synthetic review.

The ZIP builder packages the current text drafts and generated assets, including the five Product Hunt exports. Check mode compares the ZIP bytes with those source files, validates the manifest, PNG dimensions, chapter/caption timing and submission text limits. CI runs check mode to catch stale bundles. Inspect the desktop and mobile captures, Product Hunt gallery previews and MP4 before publishing new media.

Deploy updated public assets, then download `/launch/tarazu-launch-kit.zip` and compare it with the checked local ZIP. Product Hunt requirements: https://help.producthunt.com/en/articles/479557-how-to-post-a-product (checked October 24, 2026).
