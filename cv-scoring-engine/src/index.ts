// Public API of the scoring engine package, for consumption by the Kargo
// hiring application (app/). Existing scoring logic is untouched; this file
// only re-exports it alongside the two new additive capabilities (brief and
// email-draft generation).

export { extractTextFromFile } from "./ingestion/extractText.js";
export { evaluateCandidateFile, evaluateCandidateText } from "./scoring/evaluateCandidate.js";
export { checkEligibility } from "./scoring/eligibility.js";
export { computeTotalYearsPMExperience } from "./scoring/experience.js";
export { toMarkdown } from "./output/toMarkdown.js";
export { HISTORICAL_FIT_CRITERIA, HISTORICAL_FIT_MAX_SCORE, JD_FIT_MAX_SCORE } from "./config/rubric.js";
export { JOB_DESCRIPTIONS } from "./config/jobDescriptions.js";
export { generateInterviewBrief } from "./generateBrief.js";
export { generateEmailDraft } from "./generateEmailDraft.js";
export type { EmailType } from "./generateEmailDraft.js";
export type {
  Role,
  CandidateEvaluation,
  ExtractedFacts,
  RawExtractedFacts,
  WorkHistoryEntry,
  CriterionScore,
  JDFitResult,
  EligibilityResult,
  InterviewProbe,
} from "./types.js";
