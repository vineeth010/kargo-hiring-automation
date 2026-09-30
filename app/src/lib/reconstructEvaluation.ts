import type { CandidateEvaluation, Role } from "cv-scoring-engine";
import type { evaluations } from "@/db/schema";

type EvaluationRow = typeof evaluations.$inferSelect;

// Rebuilds the CandidateEvaluation shape cv-scoring-engine's brief/email-draft
// generators expect, from a stored evaluations row. candidateName is left as
// a placeholder — those generators never read it (by design, they operate
// on PII-free data), it only exists to satisfy the shared type.
export function toCandidateEvaluation(row: EvaluationRow, role: Role): CandidateEvaluation {
  return {
    candidateName: "Candidate",
    role,
    eligibility: {
      status: row.eligibilityStatus,
      hardRequirementIssues: row.hardRequirementIssues as string[],
    },
    historicalFit: row.historicalFit as CandidateEvaluation["historicalFit"],
    historicalFitTotal: { score: row.historicalFitTotal, maxScore: 70 },
    jdFit: row.jdFit as CandidateEvaluation["jdFit"],
    overallTotal: row.overallScore !== null ? { score: row.overallScore, maxScore: 100 } : null,
    rankingRationale: row.rankingRationale,
    gapsAndUncertainty: row.gapsAndUncertainty as string[],
    interviewProbes: row.interviewProbes as CandidateEvaluation["interviewProbes"],
    extractedFacts: row.extractedFacts as CandidateEvaluation["extractedFacts"],
  };
}
