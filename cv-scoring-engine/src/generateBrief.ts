import { z } from "zod";
import { callGemini } from "./llm/geminiClient.js";
import type { CandidateEvaluation } from "./types.js";

// New, additive capability (not part of the original scoring pipeline): turns
// an already-computed, PII-free CandidateEvaluation into a short brief Arjun
// can read in seconds. Reuses the engine's existing Gemini call plumbing
// rather than standing up a second LLM integration.

const briefResponseSchema = z.object({
  briefText: z.string(),
});

const GEMINI_BRIEF_SCHEMA = {
  type: "object",
  properties: {
    briefText: {
      type: "string",
      description: "A concise, 3-sentence brief summarizing the candidate for a busy hiring manager.",
    },
  },
  required: ["briefText"],
} as const;

function buildBriefPrompt(evaluation: CandidateEvaluation): string {
  return `You are writing a 3-sentence interview brief for Arjun, Kargo's founder, who needs to decide in under 10 minutes whether to move a candidate forward. You are given a structured, already-scored evaluation (no personal identifying information included) — do not invent facts beyond what's here.

Role: ${evaluation.role}
Eligibility: ${evaluation.eligibility.status}${evaluation.eligibility.hardRequirementIssues.length ? ` (${evaluation.eligibility.hardRequirementIssues.join("; ")})` : ""}
Historical Kargo-fit: ${evaluation.historicalFitTotal.score}/${evaluation.historicalFitTotal.maxScore}
JD fit: ${evaluation.jdFit.score}/${evaluation.jdFit.maxScore}
Overall: ${evaluation.overallTotal ? `${evaluation.overallTotal.score}/100` : "N/A (not eligible)"}
Ranking rationale: ${evaluation.rankingRationale}
Key gaps/uncertainty: ${evaluation.gapsAndUncertainty.join("; ") || "None noted"}

Write exactly 3 sentences: (1) who this candidate is professionally and their strongest resemblance to Kargo's historical-fit pattern, (2) the single most important thing to verify or probe in an interview, (3) a one-line bottom-line steer. Do not use the candidate's name (you don't have it) — refer to "the candidate." Return JSON matching the schema, no text outside the JSON.`;
}

export async function generateInterviewBrief(
  evaluation: CandidateEvaluation,
): Promise<string> {
  const prompt = buildBriefPrompt(evaluation);
  const parsed = await callGemini(prompt, GEMINI_BRIEF_SCHEMA);
  const result = briefResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Gemini brief response did not match schema: ${result.error.message}`);
  }
  return result.data.briefText;
}
