export type Role = "PM" | "SPM";

export interface WorkHistoryEntry {
  title: string;
  company: string;
  startDate: string; // "YYYY-MM" — LLM normalizes free-text dates to this
  endDate: string; // "YYYY-MM" or "present"
  isPMRole: boolean; // true if this entry is itself a PM/SPM-titled role
  sectorTags: string[]; // e.g. ["logistics", "b2b-saas"]
}

// As extracted directly by the LLM — everything except the years-of-PM-
// experience total, which is computed deterministically in code instead (see
// scoring/experience.ts). Date arithmetic over overlapping "present"-ended
// roles is not something to trust a model's self-reported total for.
export interface RawExtractedFacts {
  candidateName: string;
  location: string;
  willingToRelocate: boolean | "unclear";
  workHistory: WorkHistoryEntry[];
}

export interface ExtractedFacts extends RawExtractedFacts {
  totalYearsPMExperience: number;
}

// As returned directly by the LLM — no maxScore, since weights are fixed
// by the rubric config and attached deterministically during aggregation.
export interface RawCriterionScore {
  score: number;
  evidence: string[];
  reasoning: string;
}

export interface CriterionScore extends RawCriterionScore {
  maxScore: number;
}

export interface RawJDFitResult {
  score: number;
  relevantExperience: string[];
  strongMatches: string[];
  relevantGaps: string[];
}

export interface JDFitResult extends RawJDFitResult {
  maxScore: number;
}

export interface InterviewProbe {
  probe: string;
  rationale: string;
}

export interface EligibilityResult {
  status: "Eligible" | "Not eligible";
  hardRequirementIssues: string[];
}

// Raw shape returned by the LLM, before deterministic post-processing.
export interface LLMEvaluationResponse {
  extractedFacts: RawExtractedFacts;
  historicalFit: {
    ownershipInAmbiguity: RawCriterionScore;
    groundLevelExposure: RawCriterionScore;
    problemActionOutcome: RawCriterionScore;
    learningAdaptation: RawCriterionScore;
    crossFunctionalExecution: RawCriterionScore;
  };
  jdFit: RawJDFitResult;
  rankingRationale: string;
  gapsAndUncertainty: string[];
  interviewProbes: InterviewProbe[];
}

// Final, fully assembled evaluation for one candidate.
export interface CandidateEvaluation {
  candidateName: string;
  role: Role;
  eligibility: EligibilityResult;
  historicalFit: {
    ownershipInAmbiguity: CriterionScore;
    groundLevelExposure: CriterionScore;
    problemActionOutcome: CriterionScore;
    learningAdaptation: CriterionScore;
    crossFunctionalExecution: CriterionScore;
  };
  historicalFitTotal: { score: number; maxScore: number };
  jdFit: JDFitResult;
  overallTotal: { score: number; maxScore: 100 } | null; // null when not eligible
  rankingRationale: string;
  gapsAndUncertainty: string[];
  interviewProbes: InterviewProbe[];
  extractedFacts: ExtractedFacts;
}
