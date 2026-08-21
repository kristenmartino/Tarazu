---
{
  "title": "What the number on the slider means",
  "description": "We normalized RICE to a continuous 1-100 scale because the math is right. A 2026 study on scale reliability told us what that scale was still missing.",
  "publishedAt": "2026-08-20",
  "tags": ["rice", "prioritization", "estimation"]
}
---

Someone on the team asked a question I didn't have a crisp answer to: is there actual research behind normalizing RICE to a continuous 1–100 scale, or did we just decide it felt more precise than the classic 3/2/1/0.5/0.25 ladder?

Good question. I went and checked.

## The part that's settled

Normalizing disparate-unit inputs onto a common scale is standard practice in multi-criteria decision analysis — reach in people, effort in person-months, confidence as a percentage, all forced onto the same range so you can multiply and divide them without the units silently lying to you. That's the actual field of practice this comes from, and it's why classic RICE's fixed ladder for impact (3, 2, 1, 0.5, 0.25) already gestures at the same idea without fully committing to it. We committed. Every input, 1 to 100, same scale, comparable across items and across quarters.

That choice holds up. I wasn't looking to undo it and the research didn't ask me to.

## The part that surprised me

What I found instead was a 2026 paper in *Behavior Research Methods*, "How continuous is continuous enough? Comparing the reliability of continuous and discrete scales." Its finding: the assumption that a continuous slider captures more real precision than a well-anchored discrete scale is, in their words, an unfounded myth. People don't reliably distinguish a 61 from a 64. The extra resolution a slider offers is mostly resolution the person dragging it never actually used.

That's a real finding about a real tradeoff, and it names something a continuous scale genuinely gives up that a discrete ladder doesn't: a shared reference point. Classic RICE's 3/2/1/0.5/0.25 means the same thing to everyone who's used the framework, because there are only five things it can mean. A 1–100 slider has no such agreement built in. If I score confidence at 62 and you score a different item at 62, we might be describing two entirely different mental states — I don't actually know what 62 means to you, and there's a decent chance you couldn't fully articulate it either.

## What we did with that

We kept the normalization exactly as it was — the units problem it solves doesn't go away because the anchoring problem exists too. What we shipped alongside it is reference bands: labeled points sitting directly on the existing 1–100 scale, so the value stays a free drag but now has shared vocabulary attached to specific positions on it.

- **Reach** — Niche, Segment, Broad, Majority, Everyone
- **Impact** — Minimal, Low, Medium, High, Massive
- **Confidence** — Guess, Weak, Strong, Certain
- **Effort** — XS, S, M, L, XL

Impact's labels are the classic RICE ladder's own words, just repositioned as landmarks on a continuous scale instead of being the only five values you're allowed to land on. You still get the resolution a slider provides; you also get a name for roughly where you are, which is the thing the paper says the raw number wasn't giving you on its own.

Effort borrows t-shirt sizing on purpose. It's the one estimation vocabulary that's already common ground between product and engineering, so there was no case for inventing new words there — XS through XL needs zero onboarding for anyone who's sat in a planning meeting before.

Confidence is the one I'd point to first. The [RICE guide](/frameworks/rice) already argues it's the input people most often fake — nobody wants to type a low number and defend it out loud. A band on the scale that's just labeled "Guess" lowers that cost to almost nothing. Dragging the slider into that band is just where the honest answer happens to sit, no confession required.

## The one thing we caught by looking, not reasoning

The first pass at Confidence's labels was two words each — "Some evidence," "Strong evidence," "Near-certain." Reads fine in a spec. Loading the actual page, at the tight spacing near the top of the scale, the labels overlapped each other. Nobody predicted that from the copy doc; the browser told us directly.

The fix was shortening to one word per band, which solved the collision and, as a side effect, made Confidence match the terse single-word style the other three dimensions already had. Sometimes the right fix and the consistent fix turn out to be the same fix. You still have to look at the screen to find out.

## Where this leaves the scale

The number on the slider still means what it always meant — a position on a normalized 1–100 range, comparable across every item in your backlog. What changed is that it's no longer a number floating with nothing around it. There's a word near it, and that word is doing real work: giving two people a shared starting point before they argue about the exact value, instead of after.

---

*More on how Tarazu computes and normalizes these scores in the [RICE scoring guide](/frameworks/rice), including where the discrete-vs-continuous tradeoff is discussed directly on the page.*
