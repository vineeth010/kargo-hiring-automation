import type { Role } from "../types.js";

// Encodes JDs/jds_/MESA_Kargo_JD_Product Manager.docx and
// .../Senior Product Manager.docx.
//
// Hard-requirement interpretation (confirmed with the user): neither JD states
// requirements as an explicit "must-have" gate section — everything reads as
// descriptive ("ideally", "comfort operating", "genuine advantage"). Only the
// two concrete, binary-checkable lines are treated as hard eligibility gates:
// years-of-PM-experience and location/in-office. Everything else under
// "What We're Looking For" is scored within the 30-point JD-fit layer instead.

export interface HardRequirementCheckResult {
  // "fail" blocks eligibility. "uncertain" does not block it (per rubric §5:
  // absence of evidence is not evidence of absence) but is surfaced as a gap.
  status: "pass" | "fail" | "uncertain";
  detail?: string;
}

export interface HardRequirement {
  id: string;
  description: string;
  check: (facts: {
    totalYearsPMExperience: number;
    location: string;
    willingToRelocate: boolean | "unclear";
  }) => HardRequirementCheckResult;
}

export interface JobDescription {
  role: Role;
  title: string;
  hardRequirements: HardRequirement[];
  jdFitGuidance: string[]; // What to evaluate for the 30-point JD-fit layer.
}

export const JOB_DESCRIPTIONS: Record<Role, JobDescription> = {
  PM: {
    role: "PM",
    title: "Product Manager",
    hardRequirements: [
      {
        id: "pm-years-experience",
        description: "2–4 years of product management experience",
        check: (f) =>
          f.totalYearsPMExperience >= 2 && f.totalYearsPMExperience <= 4
            ? { status: "pass" }
            : {
                status: "fail",
                detail: `Candidate has ${f.totalYearsPMExperience} years of PM experience; role requires 2–4 years.`,
              },
      },
      {
        id: "location-in-office",
        description: "Mumbai-based or willing to relocate; role is in-office",
        check: (f) =>
          f.location.toLowerCase().includes("mumbai") ||
          f.willingToRelocate === true
            ? { status: "pass" }
            : f.willingToRelocate === "unclear"
              ? {
                  status: "uncertain",
                  detail:
                    "CV does not indicate whether the candidate is Mumbai-based or willing to relocate (in-office role).",
                }
              : {
                  status: "fail",
                  detail: `Candidate is based in ${f.location} and CV indicates unwillingness to relocate; role is in-office in Mumbai.`,
                },
      },
    ],
    jdFitGuidance: [
      "Relevant product-management experience",
      "Customer discovery / user understanding",
      "Product ownership",
      "Ability to operate in ambiguous or early-stage environments",
      "Logistics / supply-chain exposure",
      "Evidence of shipping, learning, and changing direction when required",
    ],
  },
  SPM: {
    role: "SPM",
    title: "Senior Product Manager",
    hardRequirements: [
      {
        id: "spm-years-experience",
        description: "5–8 years of product management experience",
        check: (f) =>
          f.totalYearsPMExperience >= 5 && f.totalYearsPMExperience <= 8
            ? { status: "pass" }
            : {
                status: "fail",
                detail: `Candidate has ${f.totalYearsPMExperience} years of PM experience; role requires 5–8 years.`,
              },
      },
      {
        id: "location-in-office",
        description: "Mumbai-based or willing to relocate; role is in-office",
        check: (f) =>
          f.location.toLowerCase().includes("mumbai") ||
          f.willingToRelocate === true
            ? { status: "pass" }
            : f.willingToRelocate === "unclear"
              ? {
                  status: "uncertain",
                  detail:
                    "CV does not indicate whether the candidate is Mumbai-based or willing to relocate (in-office role).",
                }
              : {
                  status: "fail",
                  detail: `Candidate is based in ${f.location} and CV indicates unwillingness to relocate; role is in-office in Mumbai.`,
                },
      },
    ],
    jdFitGuidance: [
      "Sufficient PM experience",
      "Platform / integration / data-layer experience",
      "Significant product decision-making",
      "Ability to operate independently in ambiguity",
      "Early-stage / build-from-scratch experience",
      "Logistics / supply-chain exposure",
      "Evidence of operating at greater scope",
    ],
  },
};
