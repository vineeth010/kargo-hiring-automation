import { z } from "zod";

// Runtime validation for the LLM's JSON response. Kept separate from the Gemini
// responseSchema (which constrains generation) so a malformed or
// schema-violating response is caught explicitly rather than silently trusted.

const rawCriterionScore = z.object({
  score: z.number(),
  evidence: z.array(z.string()),
  reasoning: z.string(),
});

const workHistoryEntry = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  isPMRole: z.boolean(),
  sectorTags: z.array(z.string()),
});

// Gemini's schema subset can't express a boolean|"unclear" union cleanly, so
// generation uses a string enum and this transforms it back to the richer
// TS-side type (boolean | "unclear") used everywhere else in the app.
const willingToRelocate = z
  .enum(["true", "false", "unclear"])
  .transform((v): boolean | "unclear" => (v === "unclear" ? "unclear" : v === "true"));

const extractedFacts = z.object({
  candidateName: z.string(),
  location: z.string(),
  willingToRelocate,
  workHistory: z.array(workHistoryEntry),
});

const rawJDFitResult = z.object({
  score: z.number(),
  relevantExperience: z.array(z.string()),
  strongMatches: z.array(z.string()),
  relevantGaps: z.array(z.string()),
});

const interviewProbe = z.object({
  probe: z.string(),
  rationale: z.string(),
});

// Historical-fit-only variant, used by the calibration harness to score the
// current_hires CVs (most of whom never applied for PM/SPM, so JD-fit and
// the PM/SPM eligibility gate don't apply to them).
export const historicalFitOnlyResponseSchema = z.object({
  candidateName: z.string(),
  historicalFit: z.object({
    ownershipInAmbiguity: rawCriterionScore,
    groundLevelExposure: rawCriterionScore,
    problemActionOutcome: rawCriterionScore,
    learningAdaptation: rawCriterionScore,
    crossFunctionalExecution: rawCriterionScore,
  }),
  rankingRationale: z.string(),
});

export const GEMINI_HISTORICAL_FIT_ONLY_SCHEMA = {
  type: "object",
  properties: {
    candidateName: { type: "string" },
    historicalFit: {
      type: "object",
      properties: {
        ownershipInAmbiguity: criterionSchema(),
        groundLevelExposure: criterionSchema(),
        problemActionOutcome: criterionSchema(),
        learningAdaptation: criterionSchema(),
        crossFunctionalExecution: criterionSchema(),
      },
      required: [
        "ownershipInAmbiguity",
        "groundLevelExposure",
        "problemActionOutcome",
        "learningAdaptation",
        "crossFunctionalExecution",
      ],
    },
    rankingRationale: { type: "string" },
  },
  required: ["candidateName", "historicalFit", "rankingRationale"],
} as const;

export const llmEvaluationResponseSchema = z.object({
  extractedFacts,
  historicalFit: z.object({
    ownershipInAmbiguity: rawCriterionScore,
    groundLevelExposure: rawCriterionScore,
    problemActionOutcome: rawCriterionScore,
    learningAdaptation: rawCriterionScore,
    crossFunctionalExecution: rawCriterionScore,
  }),
  jdFit: rawJDFitResult,
  rankingRationale: z.string(),
  gapsAndUncertainty: z.array(z.string()),
  interviewProbes: z.array(interviewProbe),
});

// Gemini's responseSchema uses a constrained OpenAPI-Schema-like subset
// (no unions besides enum, no $ref). Hand-written to mirror the zod schema
// above so generation is constrained to the same shape it's validated against.
export const GEMINI_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    extractedFacts: {
      type: "object",
      properties: {
        candidateName: { type: "string" },
        location: { type: "string" },
        willingToRelocate: {
          type: "string",
          enum: ["true", "false", "unclear"],
          description:
            "Whether the CV indicates willingness to relocate to Mumbai / be in-office. Use 'unclear' if not stated.",
        },
        workHistory: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              company: { type: "string" },
              startDate: { type: "string", description: "YYYY-MM" },
              endDate: {
                type: "string",
                description: "YYYY-MM or 'present'",
              },
              isPMRole: { type: "boolean" },
              sectorTags: { type: "array", items: { type: "string" } },
            },
            required: [
              "title",
              "company",
              "startDate",
              "endDate",
              "isPMRole",
              "sectorTags",
            ],
          },
        },
      },
      required: ["candidateName", "location", "willingToRelocate", "workHistory"],
    },
    historicalFit: {
      type: "object",
      properties: {
        ownershipInAmbiguity: criterionSchema(),
        groundLevelExposure: criterionSchema(),
        problemActionOutcome: criterionSchema(),
        learningAdaptation: criterionSchema(),
        crossFunctionalExecution: criterionSchema(),
      },
      required: [
        "ownershipInAmbiguity",
        "groundLevelExposure",
        "problemActionOutcome",
        "learningAdaptation",
        "crossFunctionalExecution",
      ],
    },
    jdFit: {
      type: "object",
      properties: {
        score: { type: "number" },
        relevantExperience: { type: "array", items: { type: "string" } },
        strongMatches: { type: "array", items: { type: "string" } },
        relevantGaps: { type: "array", items: { type: "string" } },
      },
      required: ["score", "relevantExperience", "strongMatches", "relevantGaps"],
    },
    rankingRationale: { type: "string" },
    gapsAndUncertainty: { type: "array", items: { type: "string" } },
    interviewProbes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          probe: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["probe", "rationale"],
      },
    },
  },
  required: [
    "extractedFacts",
    "historicalFit",
    "jdFit",
    "rankingRationale",
    "gapsAndUncertainty",
    "interviewProbes",
  ],
} as const;

function criterionSchema() {
  return {
    type: "object",
    properties: {
      score: { type: "number" },
      evidence: { type: "array", items: { type: "string" } },
      reasoning: { type: "string" },
    },
    required: ["score", "evidence", "reasoning"],
  };
}
