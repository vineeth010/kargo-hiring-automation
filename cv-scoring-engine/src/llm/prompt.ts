import { HISTORICAL_FIT_CRITERIA, SCORING_PRINCIPLES } from "../config/rubric.js";
import { JOB_DESCRIPTIONS } from "../config/jobDescriptions.js";
import type { Role } from "../types.js";

function criteriaBlockText(): string {
  return HISTORICAL_FIT_CRITERIA.map(
    (c) => `### ${c.label} (max ${c.maxScore} points) — key: ${c.key}
What to look for:
${c.lookFor.map((l) => `- ${l}`).join("\n")}
Strong evidence: ${c.strongEvidence}
Weak evidence (do not reward on its own): ${c.weakEvidence}`,
  ).join("\n\n");
}

// Used only by the calibration harness: scores a candidate against the
// historical Kargo-fit layer alone, regardless of the role they were
// actually hired into (that layer is defined as role-agnostic in the rubric).
export function buildHistoricalFitOnlyPrompt(cvText: string): string {
  return `You are scoring a CV against Kargo's historical Kargo-fit rubric only (this is a calibration check, not a live hiring decision). Kargo's founder makes the final call — you only recommend and explain. Be conservative and evidence-based.

## Scoring principles (must follow)
${SCORING_PRINCIPLES.map((p) => `- ${p}`).join("\n")}

## Score historical Kargo-fit (70 points total)
Does the candidate resemble the pattern seen in Kargo's past successful hires, independent of their specific role title? Score each of the following five criteria from CV evidence only.

${criteriaBlockText()}

Write a concise rankingRationale connecting the scores to the candidate's evidence.

## Candidate CV
"""
${cvText}
"""

Return your evaluation as a single JSON object matching the provided response schema. Do not include any text outside the JSON.`;
}

export function buildEvaluationPrompt(cvText: string, role: Role): string {
  const jd = JOB_DESCRIPTIONS[role];
  const criteriaBlock = criteriaBlockText();
  const today = new Date().toISOString().slice(0, 7); // YYYY-MM

  return `You are scoring a candidate CV for Kargo, a Series A logistics SaaS company, against a calibrated hiring rubric. Kargo's founder, Arjun, makes the final hiring decision — you only recommend and explain. Be conservative and evidence-based.

Today's date is ${today}. Use this as "present" whenever a CV lists an ongoing role.

## Scoring principles (must follow)
${SCORING_PRINCIPLES.map((p) => `- ${p}`).join("\n")}

## Step 1 — Extract facts (for the eligibility gate)
From the CV, extract: candidate name, current location, whether the CV gives any signal about willingness to relocate to Mumbai / work in-office ("unclear" if not stated), and full work history (title, company, start date normalized to YYYY-MM, end date normalized to YYYY-MM or the literal string "present" for any role marked ongoing/current, whether each role was itself a PM/SPM-titled role, and sector tags such as "logistics", "b2b-saas", "supply-chain"). Do not compute a total years-of-PM-experience figure yourself — that is derived from workHistory afterward using today's date.

## Step 2 — Score historical Kargo-fit (70 points total)
This is the primary signal: does the candidate resemble the pattern seen in Kargo's past successful hires, independent of their specific role title? Score each of the following five criteria from CV evidence only.

${criteriaBlock}

## Step 3 — Score JD fit for the ${jd.title} role (30 points total)
This is a secondary, role-specific layer — it refines but does not override the historical-fit score. Do not count keyword matches; assess relevance of demonstrated experience.
Evaluate against:
${jd.jdFitGuidance.map((g) => `- ${g}`).join("\n")}

## Step 4 — Ranking rationale, gaps, and interview probes
Write a concise rankingRationale connecting the scores to the candidate's evidence, focused on whether they resemble Kargo's historical successful-hire pattern.
List gapsAndUncertainty: important areas where evidence is missing or ambiguous, or where the candidate does not appear to meet a non-hard JD preference. Do not treat missing evidence as proof the candidate lacks the characteristic — phrase these as open questions, not deficiencies.
Generate 3–5 interviewProbes, each grounded in this specific candidate's actual CV content and a specific rubric criterion or gap — not generic PM interview questions.

## Candidate CV
"""
${cvText}
"""

Return your evaluation as a single JSON object matching the provided response schema. Do not include any text outside the JSON.`;
}
