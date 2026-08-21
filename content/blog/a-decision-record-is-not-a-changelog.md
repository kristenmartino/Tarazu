---
{
  "title": "A decision record isn't a changelog",
  "description": "Teams remember what they chose and forget why. What to write down at the moment of the call, and why the rejected options matter more than the chosen one.",
  "publishedAt": "2026-08-12",
  "tags": ["decision-records", "product-management", "prioritization"]
}
---

Every product team has a record of what it shipped. Almost none have a record of what they decided.

Those sound like the same thing. They aren't, and the gap between them is why the same argument reopens every quarter with the same people reaching the same conclusion, having lost the reasoning that got them there the first time.

## The thing that gets lost

A backlog is a snapshot of a conclusion. It tells you that self-serve onboarding is ranked first and SSO is ranked third. What it doesn't tell you — what it structurally cannot tell you — is:

- What SSO was ranked *against*, and how close it was
- How confident anyone was in the numbers that produced the ranking
- What would have changed the answer
- Who disagreed, and on what grounds

Three months later someone asks why SSO isn't shipping. The honest answer is "because in March we thought reach was low and effort was high." But nobody wrote that down, so the answer becomes a re-derivation: someone reopens the sheet, re-argues it from scratch, and lands wherever the current loudest opinion pushes them. The first decision provided no leverage on the second, which means it was, in retrospect, mostly wasted.

A spreadsheet preserves the numbers and discards the argument. The numbers are the part you could reconstruct; the argument is the part you cannot.

## What a decision record actually contains

Not a lot. This is a five-minute artifact, and the discipline is in what you leave out.

**The choice.** What you're doing, stated so a stranger could tell whether it happened.

**The alternatives you rejected.** This is the part that matters most later, and the part everyone skips. "We chose A" is barely information. "We chose A over B and C, and B was close" is the actual decision, because it tells a future reader which door to reopen when conditions change.

**The reasoning, in one or two sentences.** Not the full debate. The compressed version that survived it: *SSO ranks third because it affects roughly 12% of accounts and the effort estimate is the highest on the board. If enterprise pipeline grows, reach changes and so does the rank.*

**Your confidence, and in what.** "High confidence on effort, low on reach" is worth more than a single number, because it tells you which input to go check when the decision starts feeling wrong.

**The tripwire.** The condition that should make you revisit this. Sometimes it's a metric, sometimes a date, sometimes an event — *if two more enterprise deals cite SSO, re-score it.* A decision without a tripwire is a decision you'll either never revisit or revisit at random.

## Why the rejected options matter most

The chosen option gets built. It will be visible, discussed, iterated on, and remembered — it needs no help from you.

The rejected options vanish. They leave no trace in the product, no trace in the roadmap, and after a few months no trace in anyone's memory except as a vague sense that "we talked about that once." So when the question comes back — and it always comes back — the team starts from zero.

Writing down what you rejected is the highest-leverage part of the whole exercise, because it's the only part that decays completely if you don't.

## What this isn't

**It's not a changelog.** A changelog records what shipped, after it shipped. A decision record is written at the moment of choosing, before the outcome is known, and its value comes precisely from being uncontaminated by hindsight. If you write it afterwards you'll write down the reasoning that turned out to be right, which isn't the reasoning you had.

**It's not a postmortem.** Postmortems examine outcomes. Decision records examine the choice under the information available at the time. A decision can be good and the outcome bad; you cannot tell those apart later without a record of what you knew.

**It's not a document nobody reads.** If it takes more than five minutes to write or more than thirty seconds to read, it won't survive contact with a real sprint. Length is the enemy here.

## The compounding part

One decision record is a note. A quarter of them is something else: a record of how your team estimates. You start to see that effort is habitually underestimated on infrastructure work, that reach on enterprise features is consistently optimistic, that the items you rank second tend to be the ones you regret deferring.

None of that's visible from a backlog, because a backlog only ever shows the current state. It's visible from a sequence of decisions with their reasoning attached — which is the same reason the last step of a prioritization loop should feed the first.

That's the whole argument for treating prioritization as a system rather than a recurring spreadsheet: not that scoring is hard, but that a decision you can explain is a decision you can learn from, and a decision you can only re-derive is one you'll pay for repeatedly.

---

*[How Tarazu works](/how-it-works) covers where decision records sit in the loop. If you want the scoring mechanics first, start with the [RICE guide](/frameworks/rice).*
