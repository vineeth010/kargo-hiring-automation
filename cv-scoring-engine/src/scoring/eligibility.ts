import { JOB_DESCRIPTIONS } from "../config/jobDescriptions.js";
import type { EligibilityResult, ExtractedFacts, Role } from "../types.js";

export interface EligibilityOutcome extends EligibilityResult {
  uncertainties: string[]; // non-blocking notes, merged into gapsAndUncertainty
}

// Deterministic eligibility gate (rubric §4). Runs on the LLM-extracted facts
// rather than asking the LLM to judge eligibility itself, so the pass/fail
// call is auditable and reproducible from the extracted data alone.
export function checkEligibility(
  facts: ExtractedFacts,
  role: Role,
): EligibilityOutcome {
  const jd = JOB_DESCRIPTIONS[role];
  const hardRequirementIssues: string[] = [];
  const uncertainties: string[] = [];

  for (const req of jd.hardRequirements) {
    const result = req.check({
      totalYearsPMExperience: facts.totalYearsPMExperience,
      location: facts.location,
      willingToRelocate: facts.willingToRelocate,
    });
    if (result.status === "fail" && result.detail) {
      hardRequirementIssues.push(result.detail);
    } else if (result.status === "uncertain" && result.detail) {
      uncertainties.push(result.detail);
    }
  }

  return {
    status: hardRequirementIssues.length === 0 ? "Eligible" : "Not eligible",
    hardRequirementIssues,
    uncertainties,
  };
}
