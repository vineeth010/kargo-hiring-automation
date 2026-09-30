import { z } from "zod";
import { callGemini } from "./llm/geminiClient.js";
import type { CandidateEvaluation, Role } from "./types.js";

// New, additive capability: drafts an interview-invite or rejection email
// from an already-computed, PII-free CandidateEvaluation. The draft uses the
// literal placeholder "{{CANDIDATE_NAME}}" for the greeting — the caller
// (application layer) substitutes the real name from its own identity store
// immediately before displaying or sending, so the candidate's name never
// needs to pass through this module or the Gemini call.
//
// This never sends anything — it only produces a draft for a human to
// review and explicitly approve.

export type EmailType = "invite" | "rejection";

const emailDraftResponseSchema = z.object({
  subject: z.string(),
  body: z.string(),
});

const GEMINI_EMAIL_DRAFT_SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string" },
    body: {
      type: "string",
      description:
        'Plain-text email body. Must start the greeting with the literal placeholder "{{CANDIDATE_NAME}}" (e.g. "Hi {{CANDIDATE_NAME}},") — do not invent a name.',
    },
  },
  required: ["subject", "body"],
} as const;

function roleTitle(role: Role): string {
  return role === "PM" ? "Product Manager" : "Senior Product Manager";
}

function buildEmailDraftPrompt(
  evaluation: CandidateEvaluation,
  emailType: EmailType,
): string {
  const roleName = roleTitle(evaluation.role);

  if (emailType === "invite") {
    return `Draft a warm, specific interview-invite email from Arjun (Kargo's founder) to a candidate for the ${roleName} role at Kargo, a Series A logistics SaaS company in Mumbai. You have no personal information about the candidate — the greeting must use the literal placeholder "{{CANDIDATE_NAME}}" exactly, e.g. "Hi {{CANDIDATE_NAME}},". Reference 1–2 concrete, specific things from their background using this rationale (do not mention scores or the rubric): "${evaluation.rankingRationale}". Propose next steps (a short call to schedule an interview). Keep it brief, genuine, and non-generic. Sign off as "Arjun". Return JSON matching the schema, no text outside the JSON.`;
  }

  return `Draft a respectful, brief rejection email from Arjun (Kargo's founder) to a candidate who applied for the ${roleName} role at Kargo, a Series A logistics SaaS company in Mumbai. You have no personal information about the candidate — the greeting must use the literal placeholder "{{CANDIDATE_NAME}}" exactly, e.g. "Hi {{CANDIDATE_NAME}},". Do not mention scores, rubrics, or specific evaluation criteria. Be warm but honest that Kargo is moving forward with other candidates for this role; leave the door open for future roles if genuine. Keep it short. Sign off as "Arjun". Return JSON matching the schema, no text outside the JSON.`;
}

export async function generateEmailDraft(
  evaluation: CandidateEvaluation,
  emailType: EmailType,
): Promise<{ subject: string; body: string }> {
  const prompt = buildEmailDraftPrompt(evaluation, emailType);
  const parsed = await callGemini(prompt, GEMINI_EMAIL_DRAFT_SCHEMA);
  const result = emailDraftResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Gemini email draft response did not match schema: ${result.error.message}`);
  }
  return result.data;
}
