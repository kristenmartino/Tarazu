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
      "Copy a saved decision as a Markdown brief, including its preserved evidence, source caveats and dated reviews. The ranked candidate table also exports to CSV and the priority view can be printed to PDF. CSV/PDF omit scoring claims, Signals, saved validation briefs and decision history. None of these is a complete workspace backup; keep separate copies of source material.",
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
      "Roadmap and discovery products can also retain evidence and reasoning. Tarazu focuses on a compact workflow: compare options, preserve the reasoning, copy a decision brief and record a dated review. Use your existing delivery tool to track execution.",
  },
  {
    question: "Is there a mobile app?",
    answer:
      "No, but the web app is responsive and works on a phone. The three-panel desktop layout collapses to a bottom-tab layout on small screens.",
  },
  {
    question: "Who built Tarazu?",
    answer:
      "Kristen Martino. She built Tarazu to keep a product choice, its sources and later reviews together.",
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
      "Available in some products; frameworks and configuration vary",
      "Will compute a score if you describe one",
    ],
    [
      "Visual tradeoff analysis",
      "Effort × impact map with labeled quadrants",
      "Only if you build the chart yourself",
      "Matrices and other comparison views are available in some products",
      "No persistent view",
    ],
    [
      "Explainable AI recommendations",
      "Reasoning shown, always editable, never auto-applied",
      "Possible through formulas, add-ons or connected tools",
      "Available in some products; inspect sources and review controls",
      "Can reason from the context you provide",
    ],
    [
      "Strategy context",
      "Strategy Brief and linked evidence inform AI suggestions",
      "Can be stored in cells, notes or linked documents",
      "May link goals, insights and supporting documents",
      "Only what you paste into the prompt",
    ],
    [
      "Decision history",
      "Preserved brief context, copyable decision brief and dated reviews",
      "Can retain reasoning and versions if you structure it",
      "May retain insights, rationale, comments and status history",
      "Conversation history; a structured decision record needs an explicit workflow",
    ],
  ],
};

/** The three failure modes of spreadsheet prioritization (brand spec §17 Section 2). */
export const SPREADSHEET_PROBLEMS = [
  {
    title: "Inconsistent scoring",
    body: "Different stakeholders apply different logic to the same scale, so a 7 from one team is not a 7 from another — unless the sheet explicitly documents the anchors and differences.",
  },
  {
    title: "Scattered context",
    body: "Research, customer feedback, and the reasoning behind a number live in three other tools, unless someone keeps the links and their context current.",
  },
  {
    title: "Weak decision memory",
    body: "Teams remember what they chose but not why. Without a recorded rationale and review habit, later readers may have to reconstruct the argument.",
  },
];
