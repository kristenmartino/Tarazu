---
{
  "title": "The argument already happened before you opened the tool",
  "description": "Prioritization tools score a decision after it's already made, somewhere else entirely. That gap explains why reach gets faked and decision logs die.",
  "publishedAt": "2026-08-21",
  "tags": ["prioritization", "decision-records", "product-management"]
}
---

Someone posts in the team channel: signups on mobile are down, can we pull the redesign forward. A reply agrees. A third person flags a scheduling conflict with the API migration, someone else says the migration can slip a week, and by the sixth message the redesign is basically green-lit. Twenty minutes later someone opens the scoring tool, types in a reach number and an effort estimate, and the resulting score puts the redesign near the top of the list.

Nothing about that sequence is unusual. I'd guess it's closer to normal than the alternative, where a team sits down together and scores cold. But it means the tool did its work after the outcome was already settled, and I think that's most of what a prioritization tool gets wrong about its own job.

## The score arrives after the decision does

A scoring tool is built around a premise: give it honest inputs from people with different views, and the arithmetic will surface a ranking worth arguing with. That premise assumes the inputs are still contested when they get entered. In the channel above, they weren't. The redesign was already the answer by the time anyone touched reach or effort — those numbers were typed in to produce a score consistent with a call already made, by people who'd already stopped disagreeing.

You can see the same shape at the level of a single input. A reach estimate given in the same meeting as the score, by the person pushing for the item, isn't really independent of the outcome it's about to justify — I've gone into that one specifically [here](/blog/reach-is-the-number-youre-guessing-at). But it's a narrower case of the same thing. The tool can't tell a number that was fought over from a number that was backfilled to match a conclusion, because on the page they look identical: same column, same font, same arithmetic.

## Why the record doesn't survive either

Teams that try to fix this usually reach for a decision log — a place to write down not just what got picked, but what it beat and why. Good idea, badly matched to when the work actually happens. If the argument occurred in a thread an hour before anyone opened the log, writing the log means re-describing something that's already over, from memory, after the fact. Writing it up at that point is data entry against a decision that's already cold, and cold data entry is the first task that gets skipped when the sprint gets busy. I've written elsewhere about [what a decision record needs to hold onto](/blog/a-decision-record-is-not-a-changelog) once it exists — the alternatives it beat, the confidence behind it, the condition that should reopen it. None of that changes the fact that maintaining a log nobody's required to touch, describing an argument that already happened somewhere else, is optional the moment things get busy. I don't have a customer count backing this up yet — Tarazu doesn't have enough users to say how often it holds here — but it matches the cause that write-ups on decision-log adoption keep landing on when they ask why teams stop: logging is duplicate work once the decision already happened somewhere else.

## What this says about scoring alone

Tarazu today is a single-player tool. You open it, you score a backlog, you get a ranked list and a tradeoff chart. That's a real and useful thing to have, and it's most of what's shipped so far.

It's also aimed at a narrower moment than the one that actually costs a team time. Scoring a backlog alone works cleanly when there's one person with the authority to just decide — a founder, someone senior enough that nobody's going to push back. Below that, on a team where more than one person has a real say and nobody can mandate how the call gets made, prioritization is contested by default, and a contested call gets argued out somewhere before anyone opens a scoring tool at all. A tool built to be used alone is built for a moment that, for a lot of teams, doesn't really occur — the actual work of prioritizing already happened, informally, in the thread.

RICE does what it does regardless of who's in the room. The mismatch sits between where the tool lives and where the argument it's supposed to structure actually takes place.

## Where that leaves it

Nothing about meeting people where the discussion happens exists in the product yet, and I want to be upfront about that rather than gesture past it. The current version's gap is clearer to me now than it was: it asks people to bring the argument to it, after the fact, when the harder and more useful version would go find the argument where it's already happening and give it some structure while it's still live. That's a much bigger thing to build than a slider and a ranked list, and I don't want to undersell how far from done it is.

But naming the gap honestly seems like the right place to start, even before there's anything to point at. A tool that only ever sees conclusions is going to keep mistaking them for inputs, no matter how carefully the math underneath is built.

---

*More on the specific reach problem in [reach is the number you're guessing at](/blog/reach-is-the-number-youre-guessing-at), and on what a record needs to hold in [a decision record isn't a changelog](/blog/a-decision-record-is-not-a-changelog).*
