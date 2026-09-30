// Encodes kargo_cv_validation_rubric.md sections 2 and 5.
// Kept as structured data (not prompt prose) so the rubric can be inspected
// or amended without touching scoring/prompt-building logic.

export interface RubricCriterion {
  key:
    | "ownershipInAmbiguity"
    | "groundLevelExposure"
    | "problemActionOutcome"
    | "learningAdaptation"
    | "crossFunctionalExecution";
  label: string;
  maxScore: number;
  lookFor: string[];
  strongEvidence: string;
  weakEvidence: string;
}

export const HISTORICAL_FIT_CRITERIA: RubricCriterion[] = [
  {
    key: "ownershipInAmbiguity",
    label: "Ownership in ambiguity",
    maxScore: 20,
    lookFor: [
      "Identified an important problem or opportunity independently",
      "Took responsibility without relying on an established playbook",
      "Built, changed, or drove something rather than only executing an assigned task",
      "Operated effectively when processes or structures were incomplete",
    ],
    strongEvidence:
      "CV clearly shows a situation/gap -> candidate took ownership -> action -> result.",
    weakEvidence:
      "Do not award strong points merely because the CV contains words like leadership, ownership, entrepreneurial, strategic, proactive. The claim needs supporting evidence.",
  },
  {
    key: "groundLevelExposure",
    label: "Ground-level operational / customer exposure",
    maxScore: 15,
    lookFor: [
      "Direct proximity to customers, users, business operations, or operational workflows",
      "Real-world problems being solved",
      "The environment in which the product or service is used",
      "For Kargo, logistics / supply-chain exposure is particularly relevant",
    ],
    strongEvidence:
      "Direct understanding of the people, workflows, and operational problems involved, not just a job title in the sector.",
    weakEvidence:
      "Do not reduce this criterion to simply 'has worked in logistics.' A logistics job title alone is not strong evidence without operational detail.",
  },
  {
    key: "problemActionOutcome",
    label: "Problem → Action → Outcome",
    maxScore: 15,
    lookFor: [
      "Measurable business results",
      "Product adoption changes",
      "Cost / revenue / efficiency impact",
      "Process improvements",
      "Concrete outcomes from an initiative",
    ],
    strongEvidence:
      "Pattern: identified X -> implemented Y -> resulted in Z, with a concrete outcome.",
    weakEvidence:
      "A responsibility statement without an outcome (e.g. 'managed X') should receive less credit than one with a measurable or concrete result.",
  },
  {
    key: "learningAdaptation",
    label: "Learning & adaptation",
    maxScore: 10,
    lookFor: [
      "Changed direction based on data or feedback",
      "Learned from failure or an unsuccessful outcome",
      "Killed, changed, or redirected an initiative when evidence warranted it",
      "Improved a process after discovering a problem",
    ],
    strongEvidence:
      "A visible learning loop: something didn't work, the candidate noticed, and changed course.",
    weakEvidence:
      "Simply having experienced failure or setbacks is not sufficient without evidence of the resulting adaptation.",
  },
  {
    key: "crossFunctionalExecution",
    label: "Cross-functional execution",
    maxScore: 10,
    lookFor: [
      "Operating across product, engineering, operations, sales, customers, design, marketing, vendors/partners",
    ],
    strongEvidence:
      "Evidence that the candidate translated between functions and moved work forward across them.",
    weakEvidence:
      "Generic 'stakeholder management' language alone, without evidence of translation or forward movement across functions, is not sufficient.",
  },
];

export const HISTORICAL_FIT_MAX_SCORE = HISTORICAL_FIT_CRITERIA.reduce(
  (sum, c) => sum + c.maxScore,
  0,
); // 70

export const JD_FIT_MAX_SCORE = 30;

export const SCORING_PRINCIPLES = [
  "Score only what is reasonably supported by the CV. Do not infer personality, motivation, intelligence, culture fit, intent, or leadership ability without concrete evidence.",
  "Do not use keyword matching as the scoring mechanism. 'Strong ownership and leadership skills' is not evidence of ownership — look for the underlying behaviour and outcomes.",
  "Do not require perfect JD matching. A candidate can have gaps against non-critical JD criteria while still being a strong match for Kargo's historical successful-hire pattern.",
  "Absence of evidence in a CV should not automatically be treated as evidence of absence — note it as a gap/uncertainty, not a penalty beyond the criterion's own scoring.",
];
