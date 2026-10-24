// @ts-check

/**
 * Product facts stated once, consumed everywhere.
 *
 * The FAQ below is rendered visibly on /faq, emitted as FAQPage JSON-LD from the
 * same array, and will feed llms-full.txt. That single-source arrangement is not
 * tidiness for its own sake: FAQ structured data that does not match visible page
 * content is a Google structured-data violation, and an llms.txt that contradicts
 * the page teaches a model the wrong answer. Sharing the array makes all three
 * byte-identical by construction.
 *
 * Answers lead with the answer. A question answered in its first sentence is what
 * gets extracted into an AI answer; one that opens with three sentences of framing
 * does not.
 */

/**
 * @typedef {Object} Faq
 * @property {string} question
 * @property {string} answer   Plain text. First sentence must stand alone as the answer.
 */

/** @type {Faq[]} */
export const FAQS = [
  {
    question: "Is Tarazu free?",
    answer:
      "Yes. Everything currently available is free, with no card required. Paid tiers are planned for shared workspaces and org-level controls, but nothing is behind a paywall today.",
  },
  {
    question: "Do I need an account to use Tarazu?",
    answer:
      "No account is needed to try guest mode. Guest workspaces are saved in your browser; signing in enables cloud sync, score history, and online AI features. Running an AI feature sends the relevant candidate content, Strategy Brief fields, competing candidates, linked signals, and related decisions through Tarazu to Anthropic.",
  },
  {
    question: "What is RICE scoring?",
    answer:
      "RICE ranks a backlog by dividing value by cost: (Reach × Impact × Confidence) ÷ Effort. Reach is how many people an item affects, impact is how much it matters to each of them, confidence is how much you trust those estimates, and effort is what it costs to build.",
  },
  {
    question: "What scale does Tarazu use for RICE inputs?",
    answer:
      "Tarazu uses a band-based adaptation of RICE: all four inputs use a 1–100 scale, and the score is round((reach × impact × confidence) ÷ max(effort, 1)). Shared anchors, audience, and timeframe define each comparison. Current band definitions and a selected recorded claim explain each input; custom values between bands remain custom. Confidence is an evidence band, not a probability. The result is a relative index, not raw users per person-day, ROI, or a ratio of benefits.",
  },
  {
    question: "Which AI models does Tarazu use?",
    answer:
      "Anthropic's Claude. Whole-backlog analysis runs on Claude Opus; per-candidate score suggestions run on Claude Sonnet. Both models are configurable through environment variables if you self-host.",
  },
  {
    question: "Does the AI make prioritization decisions for me?",
    answer:
      "No. Every AI output is a draft with its reasoning attached, and a person has to accept it before it counts. The point of a prioritization system is that someone is accountable for the call, and you cannot hold a model accountable.",
  },
  {
    question: "Where is my data stored?",
    answer:
      "Guest workspaces are saved in your browser's local storage. AI requests send relevant content to Tarazu's server and Anthropic. Signed-in workspaces sync to a Postgres database with row-level security enabled.",
  },
  {
    question: "Does my data get sent to Anthropic?",
    answer:
      "Only when you sign in and run an AI feature, and only the workspace content needed for that request. The API key lives server-side in Tarazu's own API routes and is never shipped to the browser. Guest workspace content is not cloud-synced unless you sign in and migrate it.",
  },
  {
    question: "Can I import my existing prioritization spreadsheet?",
    answer:
      "Yes. Tarazu imports CSV and maps your columns onto reach, impact, confidence, and effort, with aliases recognised for common column names. Values outside the 1–100 range are clamped rather than rejected.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes. Ranked candidates export to CSV, and the priority view exports to PDF. There is no lock-in: what you import you can take back out.",
  },
  {
    question: "Does Tarazu work offline?",
    answer:
      "Guest mode does, since it runs against local storage. The app detects when you go offline and tells you. AI features require sign-in and a connection, because they call Anthropic's API.",
  },
  {
    question: "What is the tradeoff map?",
    answer:
      "A scatter plot of your backlog with effort on the horizontal axis and impact on the vertical, split into four quadrants. The boundaries are QUICK WIN (effort ≤ 50, impact > 50), STRATEGIC (effort > 50, impact > 50), FILL-IN (effort ≤ 50, impact ≤ 50), and THANKLESS (effort > 50, impact ≤ 50).",
  },
  {
    question: "How is Tarazu different from a roadmap tool like Jira or Productboard?",
    answer:
      "Those tools are built to track work; Tarazu is built to decide what work to do. It ends where a roadmap tool begins — with a ranked list, a recorded rationale, and an outcome to measure against later.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "No, but the web app is responsive and works on a phone. The three-panel desktop layout collapses to a bottom-tab layout on small screens.",
  },
  {
    question: "Who built Tarazu?",
    answer:
      "Kristen Martino, an AI-native product manager. Tarazu began as a demonstration that prioritization deserves a purpose-built system rather than another spreadsheet.",
  },
];

/**
 * The category comparison from the brand system spec (§17 Section 4).
 * Columns are deliberately *categories*, not named competitors: naming brands
 * means making factual claims about their feature sets that go stale and that we
 * would then have to defend.
 */
export const CATEGORY_COMPARISON = {
  columns: ["Capability", "Tarazu", "Spreadsheets", "Roadmap tools", "Generic AI assistants"],
  rows: [
    [
      "Framework-based scoring",
      "Built in, with a band-based RICE index on a 1–100 scale",
      "Whatever you build by hand, per sheet",
      "Sometimes, usually as an add-on field",
      "Will compute a score if you describe one",
    ],
    [
      "Visual tradeoff analysis",
      "Effort × impact map with labeled quadrants",
      "Only if you build the chart yourself",
      "Rarely — timelines, not tradeoffs",
      "No persistent view",
    ],
    [
      "Explainable AI recommendations",
      "Reasoning shown, always editable, never auto-applied",
      "None",
      "Increasingly, quality varies",
      "Yes, but ungrounded in your backlog",
    ],
    [
      "Strategy context",
      "Strategy Brief and linked evidence inform AI suggestions",
      "Lives in a different document",
      "Usually a separate module",
      "Only what you paste into the prompt",
    ],
    [
      "Decision history",
      "Score history, revert, and a recorded rationale",
      "Lost on the next edit",
      "Tracks status changes, not reasoning",
      "None — the conversation is the record",
    ],
  ],
};

/** The three failure modes of spreadsheet prioritization (brand spec §17 Section 2). */
export const SPREADSHEET_PROBLEMS = [
  {
    title: "Inconsistent scoring",
    body: "Different stakeholders apply different logic to the same scale, so a 7 from one team is not a 7 from another — and nothing in the sheet makes that visible.",
  },
  {
    title: "Scattered context",
    body: "Research, customer feedback, and the reasoning behind a number live in three other tools, so the evidence for a score is never where the score is.",
  },
  {
    title: "Weak decision memory",
    body: "Teams remember what they chose but not why. The numbers survive an edit; the argument that produced them does not, which is why the same debate reopens every quarter.",
  },
];
