import { HISTORICAL_FIT_CRITERIA, HISTORICAL_FIT_MAX_SCORE, JD_FIT_MAX_SCORE } from "../config/rubric.js";
import { checkEligibility } from "./eligibility.js";
import { computeTotalYearsPMExperience } from "./experience.js";
import type { CandidateEvaluation, ExtractedFacts, LLMEvaluationResponse, Role } from "../types.js";

function clamp(score: number, maxScore: number): number {
  return Math.min(Math.max(score, 0), maxScore);
}

// Deterministically assembles the final, rubric-shaped evaluation from the
// LLM's raw response: attaches fixed rubric weights, clamps out-of-range
// scores (an LLM has no built-in guarantee of respecting a max), runs the
// eligibility gate, and computes totals per rubric §4 (no overall total for
// ineligible candidates — a high historical-fit score should not be able to
// visually compensate for an eligibility failure).
export function aggregateEvaluation(
  llmResponse: LLMEvaluationResponse,
  role: Role,
): CandidateEvaluation {
  const extractedFacts: ExtractedFacts = {
    ...llmResponse.extractedFacts,
    totalYearsPMExperience: computeTotalYearsPMExperience(
      llmResponse.extractedFacts.workHistory,
    ),
  };

  const eligibility = checkEligibility(extractedFacts, role);

  const historicalFit = {
    ownershipInAmbiguity: attachMax(
      llmResponse.historicalFit.ownershipInAmbiguity,
      "ownershipInAmbiguity",
    ),
    groundLevelExposure: attachMax(
      llmResponse.historicalFit.groundLevelExposure,
      "groundLevelExposure",
    ),
    problemActionOutcome: attachMax(
      llmResponse.historicalFit.problemActionOutcome,
      "problemActionOutcome",
    ),
    learningAdaptation: attachMax(
      llmResponse.historicalFit.learningAdaptation,
      "learningAdaptation",
    ),
    crossFunctionalExecution: attachMax(
      llmResponse.historicalFit.crossFunctionalExecution,
      "crossFunctionalExecution",
    ),
  };

  const historicalFitScore = Object.values(historicalFit).reduce(
    (sum, c) => sum + c.score,
    0,
  );

  const jdFit = {
    ...llmResponse.jdFit,
    score: clamp(llmResponse.jdFit.score, JD_FIT_MAX_SCORE),
    maxScore: JD_FIT_MAX_SCORE,
  };

  const overallTotal =
    eligibility.status === "Eligible"
      ? { score: historicalFitScore + jdFit.score, maxScore: 100 as const }
      : null;

  return {
    candidateName: llmResponse.extractedFacts.candidateName,
    role,
    eligibility: {
      status: eligibility.status,
      hardRequirementIssues: eligibility.hardRequirementIssues,
    },
    historicalFit,
    historicalFitTotal: { score: historicalFitScore, maxScore: HISTORICAL_FIT_MAX_SCORE },
    jdFit,
    overallTotal,
    rankingRationale: llmResponse.rankingRationale,
    gapsAndUncertainty: [
      ...llmResponse.gapsAndUncertainty,
      ...eligibility.uncertainties,
    ],
    interviewProbes: llmResponse.interviewProbes,
    extractedFacts,
  };
}

function attachMax(
  raw: { score: number; evidence: string[]; reasoning: string },
  key: (typeof HISTORICAL_FIT_CRITERIA)[number]["key"],
) {
  const criterion = HISTORICAL_FIT_CRITERIA.find((c) => c.key === key)!;
  return { ...raw, score: clamp(raw.score, criterion.maxScore), maxScore: criterion.maxScore };
}
