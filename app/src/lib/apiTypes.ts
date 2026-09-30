// Client-safe shapes mirroring what the API routes return as JSON. Kept
// separate from the Drizzle schema types so client components never import
// server-only modules (db client, node postgres driver, secrets).

export interface CriterionScoreJson {
  score: number;
  maxScore: number;
  evidence: string[];
  reasoning: string;
}

export interface HistoricalFitJson {
  ownershipInAmbiguity: CriterionScoreJson;
  groundLevelExposure: CriterionScoreJson;
  problemActionOutcome: CriterionScoreJson;
  learningAdaptation: CriterionScoreJson;
  crossFunctionalExecution: CriterionScoreJson;
}

export interface JdFitJson {
  score: number;
  maxScore: number;
  relevantExperience: string[];
  strongMatches: string[];
  relevantGaps: string[];
}

export interface WorkHistoryEntryJson {
  title: string;
  company: string;
  startDate: string;
  endDate: string;
  isPMRole: boolean;
  sectorTags: string[];
}

export interface ExtractedFactsJson {
  location: string;
  willingToRelocate: boolean | "unclear";
  totalYearsPMExperience: number;
  workHistory: WorkHistoryEntryJson[];
}

export interface InterviewProbeJson {
  probe: string;
  rationale: string;
}

export interface EmailDraftJson {
  id: string;
  candidateId: string;
  evaluationId: string;
  emailType: "invite" | "rejection";
  subject: string;
  bodyTemplate: string;
  status: "draft" | "sent" | "failed";
  resendMessageId: string | null;
  sentAt: string | null;
  createdAt: string;
}

export interface EvaluationJson {
  id: string;
  eligibilityStatus: "Eligible" | "Not eligible";
  hardRequirementIssues: string[];
  historicalFit: HistoricalFitJson;
  historicalFitTotal: number;
  jdFit: JdFitJson;
  overallScore: number | null;
  rankingRationale: string;
  gapsAndUncertainty: string[];
  interviewProbes: InterviewProbeJson[];
  extractedFacts: ExtractedFactsJson;
  routingDecision: "review_queue" | "screening_queue";
  routingReason: string;
  manuallyPromoted: boolean;
}

export interface CandidateDetailJson {
  candidate: {
    id: string;
    roleId: "PM" | "SPM";
    status: string;
    decision: "pending" | "interview" | "reject";
    processingError: string | null;
  };
  identity: { fullName: string; email: string | null; phone: string | null } | null;
  evaluation: EvaluationJson | null;
  brief: { briefText: string } | null;
  drafts: EmailDraftJson[];
}

export interface QueueRowJson {
  candidateId: string;
  status: string;
  decision: "pending" | "interview" | "reject";
  fullName: string;
  overallScore: number | null;
  historicalFitTotal: number;
  eligibilityStatus: "Eligible" | "Not eligible";
  routingReason: string;
  manuallyPromoted: boolean;
  extractedFacts: ExtractedFactsJson;
}
