import Link from "next/link";
import { MarketingShell } from "../../../src/components/marketing/MarketingShell";
import { PageHero, Section, Prose, KeyFact, ComparisonTable, CtaBand } from "../../../src/components/marketing/blocks";
import { JsonLd } from "../../../src/components/JsonLd";
import { graph, webPage, breadcrumbs } from "../../../lib/schema";
import { pageMetadata } from "../../../lib/metadata";
import { findRoute } from "../../../lib/routes";
import { rice, getTier } from "../../../src/utils";

const route = findRoute("/frameworks/rice");

export const metadata = pageMetadata(route);

// The worked example is COMPUTED, not typed out. Every number below comes from
// the same rice() and getTier() the product runs, so the page cannot drift from
// the implementation — if the formula changes, this table changes with it, and
// page.test.jsx asserts the two agree.
const CANDIDATES = [
  { name: "Self-serve onboarding", reach: 80, impact: 90, confidence: 80, effort: 30 },
  { name: "Usage-based billing", reach: 60, impact: 85, confidence: 70, effort: 65 },
  { name: "SSO & SCIM", reach: 35, impact: 70, confidence: 90, effort: 50 },
  { name: "Mobile companion app", reach: 70, impact: 65, confidence: 50, effort: 90 },
];

// getTier only reads `label` off its return value; the theme argument supplies
// colours we don't need here.
const TIER_LABEL = (c) => getTier(c, {}).label;
const n = (value) => value.toLocaleString("en-US");

const ranked = [...CANDIDATES]
  .map((c) => ({ ...c, score: rice(c), tier: TIER_LABEL(c) }))
  .sort((a, b) => b.score - a.score);

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth"];

// The cheap-but-narrow item: sits in the QUICK WIN quadrant yet does not top the
// ranking. Derived rather than named, so the prose stays true if the numbers move.
const quickWinIndex = ranked.findIndex((c, i) => c.tier === "QUICK WIN" && i > 0);
const understatedQuickWin = ranked[quickWinIndex];

export default function RicePage() {
  return (
    <MarketingShell>
      <JsonLd
        id="ld-rice"
        data={graph(
          webPage(route),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Frameworks", path: "/frameworks/rice" },
            { name: "RICE scoring", path: route.path },
          ])
        )}
      />

      <PageHero
        eyebrow="Frameworks"
        title={<>RICE scoring, without the <span className="br">false precision.</span></>}
        lede="RICE turns four estimates into one number. That number is only as honest as the estimates behind it — and only useful if you know what it hides."
      />

      <Section id="formula">
        <Prose>
          <h2>The formula</h2>
          <p>
            RICE ranks a backlog by dividing the value of an item by what it costs to
            build:
          </p>

          <KeyFact label="RICE score">
            <p>
              <code>RICE = (Reach × Impact × Confidence) ÷ Effort</code>
            </p>
          </KeyFact>

          <p>
            The framework comes from Intercom, which needed a way to compare features
            that different teams each believed were urgent. Its contribution is not
            mathematical sophistication — it is forcing four separate judgements into
            the open, where they can be argued with individually.
          </p>

          <h3>What each input means</h3>
          <ul>
            <li>
              <strong>Reach</strong> — how many people this affects in a set period.
              The most objective input, because you can usually go and measure it.
            </li>
            <li>
              <strong>Impact</strong> — how much it matters to each person it reaches.
              Classic RICE uses a fixed ladder (3 = massive, 2 = high, 1 = medium,
              0.5 = low, 0.25 = minimal) specifically to stop the endless argument
              between 7 and 8.
            </li>
            <li>
              <strong>Confidence</strong> — how much you trust the three numbers you
              just wrote down. This is the input that makes RICE honest, and the one
              people most often fake.
            </li>
            <li>
              <strong>Effort</strong> — total cost across everyone involved, not just
              engineering. It is the denominator, so underestimating it inflates the
              score faster than overstating any other input.
            </li>
          </ul>
        </Prose>
      </Section>

      <Section id="worked-example" alt>
        <Prose>
          <h2>A worked example</h2>
          <p>
            Four candidates, scored on Tarazu&apos;s 1–100 scale. The arithmetic is
            shown so you can check it:
          </p>
        </Prose>

        <ComparisonTable
          caption="Each score is (Reach × Impact × Confidence) ÷ Effort, rounded."
          columns={["Candidate", "Reach", "Impact", "Confidence", "Effort", "Arithmetic", "Score"]}
          rows={ranked.map((c) => [
            c.name,
            String(c.reach),
            String(c.impact),
            String(c.confidence),
            String(c.effort),
            `${n(c.reach * c.impact * c.confidence)} ÷ ${c.effort}`,
            n(c.score),
          ])}
        />

        <Prose>
          <p>
            The ranking falls out of the arithmetic: <strong>{ranked[0].name}</strong>{" "}
            wins at {n(ranked[0].score)} because it reaches a lot of people, matters to
            them, and is cheap. <strong>{ranked[ranked.length - 1].name}</strong> comes
            last at {n(ranked[ranked.length - 1].score)} — not because it is a bad idea,
            but because a low confidence estimate and the highest effort compound
            against it.
          </p>
          <p>
            Notice the absolute values are large and meaningless on their own. A RICE
            score of {n(ranked[0].score)} does not denote anything in the world. It is
            ordinal: the only question it answers is which item outranks which.
          </p>
        </Prose>
      </Section>

      <Section id="normalized">
        <Prose>
          <h2>Normalized RICE: why Tarazu scores every input 1–100</h2>
          <p>
            Classic RICE mixes units. Reach is a count of people, impact is a
            multiplier from a fixed ladder, confidence is a percentage, and effort is
            person-months. Multiply and divide across four different units and the
            result is arithmetically valid but dimensionally meaningless — which is why
            two teams using &ldquo;the same&rdquo; framework routinely produce scores
            that cannot be compared.
          </p>

          <KeyFact label="How Tarazu computes it">
            <p>
              <code>score = round((reach × impact × confidence) ÷ max(effort, 1))</code>
            </p>
            <p style={{ marginTop: 10 }}>
              All four inputs sit on the same 1–100 scale. The{" "}
              <code>max(effort, 1)</code> guard exists so an effort of zero cannot
              divide by zero and produce an infinite score.
            </p>
          </KeyFact>

          <p>
            Normalizing buys comparability: scores mean the same thing across teams and
            across quarters, and a whole class of unit-mismatch bug disappears.
          </p>
          <p>
            <strong>What it costs you</strong> is the literal reading. In classic RICE
            you can say &ldquo;this reaches 4,000 users a quarter.&rdquo; On a 1–100
            scale you are saying &ldquo;this reaches far more people than that one,
            about four-fifths of the most reach anything here has.&rdquo; That is a
            real loss, and worth knowing you have accepted. If your team genuinely has
            trustworthy reach data in absolute units, classic RICE preserves
            information that normalization discards.
          </p>
        </Prose>
      </Section>

      <Section id="where-rice-breaks" alt>
        <Prose>
          <h2>Where RICE breaks</h2>
          <p>
            Every framework has a domain where it stops helping. RICE has four, and
            knowing them is the difference between using the score and being used by
            it.
          </p>

          <h3>Confidence is the input people fake</h3>
          <p>
            Multiplying by a made-up 0.8 does not represent uncertainty — it launders a
            guess into something that looks quantified. If nobody can say what evidence
            moved confidence from 50 to 80, the number is decoration. The honest move
            when confidence is genuinely low is to stop scoring and go get evidence,
            not to score anyway with a discount applied.
          </p>

          <h3>Reach you cannot measure is not reach</h3>
          <p>
            Reach is the one input you can usually verify, which makes it the one most
            worth verifying. A reach estimate produced in the same meeting as the
            score, by the same person advocating for the item, is not an input — it is
            the conclusion wearing a number.
          </p>

          <h3>RICE ranks; it does not sequence</h3>
          <p>
            The formula has no concept of dependency, and a ranked list reads as an
            order of work even though it is not one. If the third item is a
            prerequisite for the first, RICE will not tell you — it will confidently
            hand you an ordering that cannot be executed.
          </p>

          <h3>The tie-break is where judgement actually lives</h3>
          <p>
            Real backlogs produce near-identical scores constantly, and the gap between
            two items is usually smaller than the error bars on the estimates that
            produced them. Treating a 12% difference as decisive is false precision.
            When scores are close, the framework has told you what it knows: these are
            comparable, and now someone has to choose.
          </p>
        </Prose>
      </Section>

      <Section id="rice-vs-ice">
        <Prose>
          <h2>RICE vs ICE vs weighted scoring</h2>
          <p>
            RICE is not the only option and often not the right one. The useful
            question is what each framework chooses to ignore:
          </p>
        </Prose>

        <ComparisonTable
          columns={["Framework", "Formula", "What it's for", "What it ignores"]}
          rows={[
            [
              "RICE",
              "(Reach × Impact × Confidence) ÷ Effort",
              "Comparing features that serve different audiences at different costs.",
              "Dependencies, strategic fit, and anything that matters intensely to a small group.",
            ],
            [
              "ICE",
              "Impact × Confidence × Ease",
              "Fast triage when you need an order this afternoon.",
              "Reach entirely — so it systematically overrates work that delights a handful of people.",
            ],
            [
              "Weighted scoring",
              "Σ (criterion × weight)",
              "When your real criteria aren't RICE's — strategic fit, compliance, revenue risk.",
              "Nothing by design, which is the risk: the weights encode the answer you wanted.",
            ],
            [
              "WSJF",
              "Cost of delay ÷ job size",
              "Sequencing when timing dominates — deadlines, market windows.",
              "Reach and confidence, and it needs a cost-of-delay estimate most teams can't produce.",
            ],
          ]}
        />

        <Prose>
          <p>
            A reasonable default: <strong>ICE</strong> when you need speed and everything
            serves roughly the same audience, <strong>RICE</strong> when audience size
            genuinely varies between items, and <strong>weighted scoring</strong> when
            your organisation has real criteria RICE cannot express. Switching
            frameworks mid-quarter to get a different answer is not prioritization; it
            is looking for permission.
          </p>
        </Prose>
      </Section>

      <Section id="from-score-to-decision" alt>
        <Prose>
          <h2>Turning a RICE score into a decision</h2>
          <p>
            The score is an input to a decision, not the decision. Two things turn one
            into the other.
          </p>

          <h3>Look at the tradeoff, not just the rank</h3>
          <p>
            Plotting effort against impact separates items a single number collapses
            together. In Tarazu the quadrants are:
          </p>
        </Prose>

        <ComparisonTable
          caption="Quadrant boundaries as Tarazu computes them."
          columns={["Quadrant", "Effort", "Impact", "What to do"]}
          rows={[
            ["QUICK WIN", "≤ 50", "> 50", "Do these first — cheap and consequential."],
            ["STRATEGIC", "> 50", "> 50", "Worth it, but plan for the cost."],
            ["FILL-IN", "≤ 50", "≤ 50", "Cheap but minor. Fill gaps; don't build a roadmap on them."],
            ["AVOID", "> 50", "≤ 50", "Expensive and minor. Say no, and record why."],
          ]}
        />

        <Prose>
          <p>
            Rank and quadrant disagree more often than you would expect. In the example
            above, <strong>{understatedQuickWin.name}</strong> sits in the QUICK WIN
            quadrant — cheap to build and the most confident estimate on the board — yet
            ranks only {ORDINALS[quickWinIndex]} of {ranked.length}, because its narrow
            reach drags the score down. That disagreement is information, not an error:
            it is exactly what a ranked list on its own will hide from you.
          </p>

          <h3>Write down why</h3>
          <p>
            The score explains the ordering. It does not explain the choice — the
            override you made, the dependency you sequenced around, the bet you took on
            low confidence anyway. Recording that is what makes a decision reviewable
            in six months, and it is precisely what a spreadsheet throws away. The
            numbers survive; the argument that produced them does not, which is why the
            same debate reopens every quarter.
          </p>
          <p>
            That loop — score, decide, record, learn — is what{" "}
            <Link href="/how-it-works">Tarazu is built around</Link>.
          </p>
        </Prose>
      </Section>

      <CtaBand
        title={<>Score your backlog, <span className="br">defensibly.</span></>}
        body="Free, and no account needed — guest mode runs entirely in your browser."
      />
    </MarketingShell>
  );
}
