---
{
  "title": "Let the model draft the score, not make the call",
  "description": "Where AI genuinely helps in prioritization, where it just launders a guess, and why the accountable step has to stay with a person who can be argued with.",
  "publishedAt": "2026-08-12",
  "tags": ["ai", "prioritization", "decision-records"]
}
---

Ask a language model to score a backlog and it will. Every item, all four RICE dimensions, confident numbers, plausible reasoning, in about eight seconds. The output looks exactly like the output of a team that spent an afternoon on it.

That resemblance is the problem worth thinking about carefully, because the two artifacts are not interchangeable and the difference is invisible on the page.

## What the model is actually good at

Three things, genuinely:

**First-pass estimates that break the blank page.** Scoring twenty items from zero is tedious enough that teams either skip it or rush it. A draft to react to is easier than a draft to originate, and reacting is where the useful thinking happens — "no, effort is way higher than that, because it touches billing" is a real contribution that the blank page would not have produced.

**Surfacing what you left out.** Models are good at the move where you describe a feature and something asks about the migration path, the permissions model, the support burden. Not because it knows your system, but because those questions recur across every system and you were thinking about the happy path.

**Arguing the other side.** Ask for the strongest case against your top-ranked item and you will usually get something worth answering. This is the least-used and most valuable mode, because it is the one where being unattached to your roadmap is an advantage rather than a limitation.

Notice that all three produce *input to a judgement*. None produces the judgement.

## What it is not good at

The model does not know your reach. It cannot: the number lives in your analytics, and if you did not tell it, whatever it produces is a plausible-looking fabrication. Same for effort, which depends on your codebase, your team, and what else is in flight.

More subtly, it does not know your strategy — not the sentence in the deck, the real one. The one that says this quarter you are willing to underinvest in retention because the enterprise motion has to land first. That constraint is what makes half of prioritization decisions non-obvious, and it is exactly the sort of thing that lives in a founder's head rather than a document.

**A confident score computed from inputs the model invented is not analysis. It is a guess with the visual signature of rigour, which is worse than a guess with the visual signature of a guess.**

## The line that matters

The useful division is not "AI for the easy parts, humans for the hard parts." It is:

> The model can produce anything you would be willing to argue with. It should not produce anything you would be tempted to accept without arguing.

A drafted score with visible reasoning invites argument — you read the reasoning, disagree with the effort estimate, and change it. A final ranking with no reasoning invites acceptance, because there is nothing to push against and the number already looks decided.

This is why reasoning attached to output is not a nice-to-have. It is the mechanism by which the output stays a draft.

## Accountability is the real constraint

The strongest argument for keeping a person in the loop is not accuracy. Models will keep getting better at estimation, and some of the objections above will weaken.

It is that **prioritization decisions get defended, and you cannot hold a model accountable.**

When someone asks why their feature was cut, the answer has to come from somebody who chose it, can explain the tradeoff, and will still be there when it turns out wrong. "The scoring model ranked it fourth" is not an answer to that question — it is a way of avoiding it. Teams notice when a decision has no author, and the ones who lost the decision notice fastest.

A prioritization system that removes the accountable human has not automated the hard part. It has relocated it, from a person who can be argued with to a process that cannot.

## What this looks like in practice

Concretely, the shape that works:

1. **Model drafts, with reasoning shown.** Every suggested score arrives with the sentence that produced it.
2. **Person edits before it counts.** Nothing enters the ranking on the model's authority alone.
3. **Grounding beats generality.** Feed it your product context and prior decisions; an estimate anchored in what your team actually shipped beats one anchored in the internet's average product team.
4. **The rationale is human.** Whatever gets recorded as the reason — see [why that record matters](/blog/a-decision-record-is-not-a-changelog) — is written by the person accountable for the call, not generated alongside it.

That is the division Tarazu is built around, and it is a deliberate constraint rather than a limitation waiting to be lifted. The AI drafts. A person decides. The interesting part was never the arithmetic.

---

*[How it works](/how-it-works) covers where the AI sits in the loop, including which model does what and what it is given as context.*
