---
{
  "title": "Reopening a decision six months later",
  "description": "An old feature argument came back in a Thursday meeting. What was actually still in the six-month-old decision record, and what quietly wasn't.",
  "publishedAt": "2026-08-21",
  "tags": ["decision-records", "prioritization", "product-management"]
}
---

Dana brought it up again in a Thursday planning meeting, phrased like a new idea: what if the weekly digest email became a real-time feed inside the product instead? A couple of people nodded along. Nobody in the room seemed to remember we'd had this exact argument in February, chosen the email, and written down why.

I remembered, mostly because I went and checked before saying anything out loud. Here's what was actually still there, six months on.

## The card, collapsed

Opening Decisions and filtering to approved turns up a short list, and the one I wanted was near the top: "Ship the weekly summary email, not an in-app feed." A green APPROVED pill next to the title, dated in February. Under it, in blue: "Chosen: Weekly summary email." Under that, two clamped lines of the summary rationale — the short version of the reasoning, readable without clicking anything: *Digest wins on effort by a wide margin and reach is nearly identical at current DAU; the case for the feed is mostly about engagement quality, which RICE doesn't score.* RICE and Theo sit as small tags at the bottom — one naming the framework, one naming whoever filled the form out.

That's the whole card at rest, and it's short on purpose. Five fields, one of them a two-line clamp, nothing demanding you read further unless you choose to.

## What was underneath

Clicking it open adds four more fields, each under its own small label. Tradeoffs considered: *In-app activity feed — better for daily-active users, real-time, no email fatigue. Needs a new nav surface and unread-state logic. Reach is close to identical at current DAU; effort is roughly triple.* That's Dana's proposal, preserved in enough detail that reading it back answered her question before I said a word in the meeting: yes, we looked at exactly this, and here's specifically what it would have cost.

Risks accepted: *Open rates decay over time. This could look strong in month one and be ignored by month four.* Expected outcome: *A bump in resurrected users within two weeks of send; the retention lift past that is unproven and is the number worth checking at review.*

And then, under its own label, a review date. May 1.

It was August.

## The date nobody looked at

That review date is the field that actually explains why this argument came back at all. May 1 wasn't a guess or an afterthought — it's a real column on the decision, sitting right next to the decision date, filled in on purpose because the risk we'd just written down had a natural check-in point: a full quarter of send data. The date got set. Nothing after that date did anything with it. Nobody gets a nudge on May 1 saying a review is due; the field just sits there, correct and inert, until a person happens to open the card, which nobody did until Dana raised the question again, three and a half months late. [A decision record isn't a changelog](/blog/a-decision-record-is-not-a-changelog) calls this a tripwire, and argues that a decision without one gets revisited at random. A tripwire nobody's watching lands in roughly the same place.

## Checking the feature itself

The decision names a chosen candidate, and that candidate is a real feature with its own history, so I opened that too. Three revisions. #1, CREATED, early February — the day it entered the backlog, scored reach 72, impact 55, confidence 40, effort 30. #2, UPDATED, the day after the decision — an engineer had actually looked at unsubscribe handling and preference storage by then: effort 30 to 55, confidence 40 to 65, status backlog to active. #3, UPDATED, late April — after the first sends went out: confidence 65 to 35, status active to done.

That third one is the real story, and the decision record doesn't have it anywhere. Confidence dropped thirty points once real open-rate data came in, three weeks before the review date that was supposed to prompt exactly this conversation. The information that should have triggered a review arrived on schedule. The review didn't happen anyway, because nothing on the feature's history points back at the review date sitting on the decision two screens away.

## What the record doesn't say

One more gap: nothing in that history says who made the April change. Each row carries a revision number, a change type, the fields that moved, and a relative timestamp — no name attached to any of it. The decision's owner field reads "Theo," which looks like an attribution until you remember it's a plain text box. Someone typed that name in at some point; nothing here confirms it was Theo, or connects that name to an account, or ties it to the person who later dropped confidence to 35.

None of that made the meeting go badly. If anything it made the meeting short: I read Dana the tradeoffs paragraph, she read the April numbers over my shoulder, and we spent the rest of the time on a genuinely open question — whether that confidence drop is itself enough new evidence to reopen the choice, which it might be. But it's worth being precise about which part of the meeting the record actually shortened. It handed us the argument back in under a minute. It didn't tell us the argument was overdue, and it couldn't have told us who to ask about the numbers even if we'd wanted to.

---

*[A decision record isn't a changelog](/blog/a-decision-record-is-not-a-changelog) goes into what a tripwire needs to hold. [The argument already happened](/blog/the-argument-already-happened) is about the meeting that produced this decision in the first place.*
