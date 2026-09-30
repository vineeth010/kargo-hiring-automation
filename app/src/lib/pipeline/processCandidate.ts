import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, extname } from "node:path";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  candidates,
  candidateIdentities,
  cvDocuments,
  evaluations,
  interviewBriefs,
  emailDrafts,
  roles,
} from "@/db/schema";
import {
  extractTextFromFile,
  evaluateCandidateText,
  generateInterviewBrief,
  generateEmailDraft,
  type Role,
} from "cv-scoring-engine";
import { redactCv } from "@/lib/pii/redact";
import { computeRouting } from "@/lib/routing/route";
import { getScreeningThreshold } from "@/lib/settings";
import { getOrCreateCurrentRubricVersion } from "@/lib/rubricVersion";

export interface ProcessCandidateInput {
  role: Role;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
}

// The single orchestration point for turning an uploaded CV into a fully
// scored, routed, briefed candidate with a ready-to-review email draft.
// PII never crosses the redactCv() -> evaluateCandidateText() boundary below.
const ROLE_TITLES: Record<Role, string> = { PM: "Product Manager", SPM: "Senior Product Manager" };

export async function processCandidate(input: ProcessCandidateInput): Promise<{ candidateId: string }> {
  await db
    .insert(roles)
    .values({ id: input.role, title: ROLE_TITLES[input.role] })
    .onConflictDoNothing({ target: roles.id });

  const [candidate] = await db
    .insert(candidates)
    .values({ roleId: input.role, status: "uploaded" })
    .returning({ id: candidates.id });
  const candidateId = candidate.id;

  try {
    // 1. Extract raw text (cv-scoring-engine's ingestion expects a file path;
    // Vercel functions can write to /tmp for the duration of the invocation).
    // turbopackIgnore: tmpdir() is an OS path outside the project, not a
    // project file — without this, Turbopack's static tracer conservatively
    // bundles the entire project into the serverless function output.
    const tempPath = join(/* turbopackIgnore: true */ tmpdir(), `${randomUUID()}${extname(input.originalFilename) || ".txt"}`);
    await writeFile(tempPath, input.fileBuffer);
    let rawText: string;
    try {
      rawText = await extractTextFromFile(tempPath);
    } finally {
      await unlink(tempPath).catch(() => {});
    }

    // 2. Redact PII locally, BEFORE anything is sent to Gemini.
    await db.update(candidates).set({ status: "redacting" }).where(eq(candidates.id, candidateId));
    const { identity, redactedText } = redactCv(rawText);

    await db.insert(candidateIdentities).values({
      candidateId,
      fullName: identity.fullName,
      email: identity.email,
      phone: identity.phone,
    });
    await db.insert(cvDocuments).values({
      candidateId,
      originalFilename: input.originalFilename,
      mimeType: input.mimeType,
      rawText,
      redactedText,
    });

    // 3. Score (existing engine, untouched) — only ever sees redactedText.
    await db.update(candidates).set({ status: "scoring" }).where(eq(candidates.id, candidateId));
    const evaluation = await evaluateCandidateText(redactedText, input.role);

    const rubricVersionId = await getOrCreateCurrentRubricVersion();
    const threshold = await getScreeningThreshold(input.role);
    const routing = computeRouting(evaluation, threshold);

    const [evaluationRow] = await db
      .insert(evaluations)
      .values({
        candidateId,
        rubricVersionId,
        extractedFacts: evaluation.extractedFacts,
        eligibilityStatus: evaluation.eligibility.status,
        hardRequirementIssues: evaluation.eligibility.hardRequirementIssues,
        historicalFit: evaluation.historicalFit,
        historicalFitTotal: evaluation.historicalFitTotal.score,
        jdFit: evaluation.jdFit,
        overallScore: evaluation.overallTotal?.score ?? null,
        rankingRationale: evaluation.rankingRationale,
        gapsAndUncertainty: evaluation.gapsAndUncertainty,
        interviewProbes: evaluation.interviewProbes,
        routingDecision: routing.decision,
        routingReason: routing.reason,
        screeningThresholdUsed: threshold,
      })
      .returning({ id: evaluations.id });

    await db.update(candidates).set({ status: "scored" }).where(eq(candidates.id, candidateId));

    // 4. Brief (new capability, reuses the engine's Gemini plumbing).
    await db.update(candidates).set({ status: "briefing" }).where(eq(candidates.id, candidateId));
    const briefText = await generateInterviewBrief(evaluation);
    await db.insert(interviewBriefs).values({ evaluationId: evaluationRow.id, briefText });

    // 5. Email draft — prepared automatically, never sent automatically.
    // Screening-queue candidates default to a rejection draft (Arjun's most
    // common action there); review-queue candidates default to an invite
    // draft. Either can be regenerated as the other once Arjun decides.
    await db.update(candidates).set({ status: "drafting_email" }).where(eq(candidates.id, candidateId));
    const emailType = routing.decision === "review_queue" ? "invite" : "rejection";
    const draft = await generateEmailDraft(evaluation, emailType);
    await db.insert(emailDrafts).values({
      candidateId,
      evaluationId: evaluationRow.id,
      emailType,
      subject: draft.subject,
      bodyTemplate: draft.body,
    });

    await db.update(candidates).set({ status: "ready" }).where(eq(candidates.id, candidateId));
    return { candidateId };
  } catch (err) {
    await db
      .update(candidates)
      .set({ status: "error", processingError: err instanceof Error ? err.message : String(err) })
      .where(eq(candidates.id, candidateId));
    throw err;
  }
}
