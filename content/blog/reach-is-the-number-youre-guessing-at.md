---
{
  "title": "Reach is the number you're guessing at",
  "description": "Reach swings a RICE score harder than any other input and is the one teams most often invent. How to bound it honestly, and what to do when you can't.",
  "publishedAt": "2026-08-12",
  "tags": ["rice", "estimation", "prioritization"]
}
---

Of the four numbers in a RICE score, three are judgement calls and one is a measurement. Reach is the measurement. It's also the one people most reliably make up.

That matters more than it sounds, because reach is a multiplier. Impact and confidence are multipliers too, but they're bounded by convention — impact sits on a fixed ladder, confidence is a percentage nobody writes above 90. Reach has no ceiling. Double it and you double the score. Get it wrong by an order of magnitude and the ranking is fiction, regardless of how carefully you argued about impact.

## The failure looks like agreement

Here is how a reach estimate usually gets made. Someone proposes a feature. Someone else asks how many people it affects. The room converges on a number within about fifteen seconds, everyone nods, and it goes in the sheet.

Nothing about that process is wrong on its face. The problem is what the number now claims to be. It entered the conversation as a guess and left it as data — same font, same column, same arithmetic as the numbers that came from analytics. A month later nobody can tell which was which.

A reach estimate produced in the same meeting as the score, by the same person advocating for the item, isn't really an input. It's the conclusion wearing a number.

## Bound it instead of guessing it

You rarely need a precise reach figure. You need one that's bounded — where you can state what it could not plausibly be above or below, and why. Three ways to get there, in descending order of how much you should trust them.

### 1. Count it

The best case, and more available than teams assume. If the feature touches an existing surface, you already know how many people touch that surface. Sessions on the settings page. Accounts with more than one seat. Users who hit the export button last quarter. This is a query, not an estimate.

The trap is counting the wrong population — "users who visited the pricing page" isn't "users who would use annual billing." Write down which population you counted, next to the number. That sentence is worth more than the number.

### 2. Ceiling it

When you can't count the affected users, count the population they must be a subset of. If a feature only applies to teams with more than five members, and 12% of accounts have more than five members, then reach cannot exceed 12% of accounts. That's not the answer, but it's a real upper bound derived from a real number.

Most useful reach estimates are of this shape: *at most X, because it cannot apply to more people than that.* A ceiling with a stated derivation beats a point estimate with none.

### 3. Bracket it

When even the ceiling is unclear, give a range and score the pessimistic end. If you think reach is somewhere between 200 and 2,000, score 200. If the item still ranks highly at the bottom of its range, the ranking is robust and you can stop arguing. If it only ranks at the top of the range, you've learned the actual thing: this item's position depends entirely on an estimate nobody can defend.

That's a finding, not a failure. It tells you the next move is research, not a scoring debate.

## What to do when reach is genuinely unknowable

Sometimes there's no population to count, because the feature is for people who aren't customers yet. New-market features, onboarding changes aimed at users who currently bounce, anything where success would change the denominator.

RICE handles this badly. The framework assumes you're allocating effort across a known audience, and a genuinely new-audience bet doesn't fit that shape. Two honest options:

- **Score it against the audience you have** and accept that the score understates it. Note the understatement in the rationale, so the low rank is a known distortion rather than a mystery.
- **Take it out of the RICE list entirely.** Exploratory bets and evergreen work often deserve a separate allocation — a fixed percentage of capacity — rather than competing on a score that cannot represent them.

The failure mode to avoid is inflating reach to make the number come out right. That's not prioritization, it's arithmetic in service of a decision already made, and it corrupts every other score in the sheet by making the scale meaningless.

## Write down where the number came from

Next to every reach estimate, record where the number came from, in a few words. `analytics, Q2 exports` or `≤12% of accounts, seats>5` or `guess, unvalidated`.

The value isn't documentation. It's that "guess, unvalidated" is uncomfortable to type, and that discomfort is doing exactly the work it should. Half the time you'll go find the real number rather than write it down. The other half you'll have flagged, honestly and cheaply, that this particular rank is standing on nothing.

Tarazu keeps that provenance attached to the candidate rather than in a comment on a cell, which is the same idea with better plumbing — but the discipline works in a spreadsheet too. The tool isn't the point. Knowing which of your numbers are measurements is.

---

*More on the framework and where it breaks down in the [RICE scoring guide](/frameworks/rice), and on what Tarazu does with these numbers in [how it works](/how-it-works).*
