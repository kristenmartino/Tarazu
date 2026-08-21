---
{
  "title": "The tie-break is the real decision",
  "description": "A four-point gap between two RICE scores usually isn't a gap at all. What to do when the framework correctly tells you it can't resolve the ranking any further.",
  "publishedAt": "2026-08-21",
  "tags": ["rice", "prioritization", "estimation"]
}
---

Two items in a backlog score 68 and 64. Someone glances at the sheet, sees one number above the other, and starts building the higher one first. Nobody in that meeting called it a coin flip. Everyone treated it like the framework had spoken.

I want to make the case that a four-point gap on a RICE sheet is, most of the time, not a finding. It's noise dressed as a finding, and the dressing is the actual problem.

## Where the four points come from

A RICE score is `(reach × impact × confidence) ÷ effort`, and on Tarazu's normalized scale, all four of those sit on 1–100. Walk through what each one is before it becomes a number.

Reach can be real. If the feature touches an existing surface with a known population, you can count it, or bound it from a real ceiling — sessions on a page, accounts with a certain plan, users who hit a specific button last quarter. I've written about how to do that honestly [elsewhere](/blog/reach-is-the-number-youre-guessing-at), and the short version is: counted reach carries something like a measurement's precision. It has an error bar, but a narrow one, because it's tied to a query someone ran.

Impact and confidence are a different animal. Impact is a judgment about how much this moves the needle, placed on a fixed ladder even when the ladder is stretched across a continuous slider. Confidence is a percentage that mostly encodes how sure a person felt in a meeting, not a distribution anyone measured. Both get typed in as numbers. Neither one comes with a method you could rerun and get the same answer from.

So a RICE score is built from at least one number that might be a real measurement, and two numbers that are judgment calls wearing a number's clothing. Multiply reach's narrow error bar by impact's wide one by confidence's wide one, divide by effort's own guess, and the thing that comes out the other end doesn't carry a small uncertainty just because the arithmetic ran cleanly. It carries whatever the worst input's uncertainty was, at minimum, and probably worse than that, because the errors don't cancel — they compound.

Nobody writes down that resulting error bar. The sheet just shows 68 and 64, same font, same column, same number of decimal places as everything else. The uncertainty didn't go away. It went invisible.

## Reading a close score as decisive is a category error

Here's the thing the RICE guide already says about this, in the section on where the framework breaks:

> Real backlogs produce near-identical scores constantly, and the gap between two items is usually smaller than the error bars on the estimates that produced them. Treating a 12% difference as decisive is false precision. When scores are close, the framework has told you what it knows: these are comparable, and now someone has to choose.

I think that's exactly right, and I want to push on the phrase that's easy to skip past: "the framework has told you what it knows." A near-tie means RICE looked at two items with close, partly-soft inputs and reported that closeness back to you — accurately. That's the honest output for that input, not a failure to resolve anything. Reading a 68 as meaningfully ahead of a 64 asks the framework for a level of precision it was never built to give.

Contrast that with what a big gap tells you. If one item scores 85 and another scores 22, the ranking is probably right even if every input is soft, because the gap would have to be almost entirely wrong before the order flipped. A 63-point spread survives a lot of noise. A 4-point spread survives almost none.

Ask a different question: not which one's higher, but how big this gap has to be before you'd trust the order it implies. For inputs built the way most RICE scores are built — one real count, two dressed-up judgment calls — that threshold is a lot higher than four points. Probably higher than most teams would guess before they sat down and thought about it this way.

## What teams do instead

Faced with a near-tie, I've watched teams reach for exactly the tie-break rules you'd predict: whichever item is listed first in the sheet, whoever argued for their item more recently or more loudly, whichever one the most senior person in the room happens to prefer that week, or just "let's go with the higher number, that's what the scoring is for." Every one of these treats the tie as a resolution problem — something to be broken — rather than as information.

That's backwards. The tie is the information. RICE looked at reach, impact, confidence, and effort for both items and came back saying it can't tell them apart with what it has. Reaching for alphabetical order or gut feel doesn't add anything to that; it just picks an answer and buries the fact that there wasn't a real basis for it. Six months from now, when someone asks why the 68 shipped before the 64, "it was listed first" is a worse answer than the honest one, which is "we couldn't tell them apart and had to decide anyway."

## What the tie-break should be

If the score can't separate two items, something else has to, and that something else is a conversation, not a rule. A few things that conversation can look for, none of them visible in the four RICE inputs:

Sequencing. RICE ranks; it doesn't sequence. Does either item unblock the other, or unblock something else already committed? A dependency breaks a tie a score never could, because it's not a fifth number to multiply in — it's a constraint the arithmetic doesn't model at all.

Which input is soft. Go back to the four numbers and ask which one is a real count and which is a guess dressed up as a number. If item A's reach was counted and item B's was estimated in the same meeting as the score, that's not a tie between equals — it's a real number sitting next to a soft one that happens to land nearby. The tie in the total conceals a real asymmetry in what's underneath it.

What you'd learn by shipping the lower-scored one first. Sometimes the honest move is to build whichever item resolves more uncertainty fastest, because a near-tie usually means you don't yet know enough to rank these two, and the fastest way to know more is to ship one and watch.

None of that lives in the multiplication. All of it lives in the room. The score did its job by telling you the room needs to have that conversation — it just can't have the conversation for you.

## Writing the tie-break down

If a decision comes down to a near-tie, that's worth recording as exactly that — not as "we picked the higher score," but as "these were within noise of each other, and here's what broke it." A [decision record](/blog/a-decision-record-is-not-a-changelog) that says "SSO scored 71, self-serve onboarding scored 68, we shipped SSO because it unblocks the enterprise deal in flight" is a real account of a real choice. Just writing "SSO scored higher" replaces the team's reasoning with the score's arithmetic, and buries the reason someone will want back the next time this comes up.

The number did what it does. It told you these two are close enough that four points isn't a real gap. The choosing part was always going to be yours.

---

*More on where RICE breaks down, including confidence-inflation and reach honesty, in the [RICE scoring guide](/frameworks/rice). On what to write down once a tie gets broken, [a decision record isn't a changelog](/blog/a-decision-record-is-not-a-changelog).*
