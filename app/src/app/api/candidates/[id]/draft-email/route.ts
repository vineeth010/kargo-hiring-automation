import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidates, evaluations, emailDrafts } from "@/db/schema";
import { generateEmailDraft, type EmailType, type Role } from "cv-scoring-engine";
import { toCandidateEvaluation } from "@/lib/reconstructEvaluation";

export const maxDuration = 30;

// Ensures a fresh draft of the requested type exists for this candidate, and
// records Arjun's decision (invite -> interview, rejection -> reject). This
// only ever prepares a draft — nothing is sent until /send-email is called
// with an explicit confirmation.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: candidateId } = await params;
  const body = (await request.json()) as { emailType?: EmailType };
  const emailType = body.emailType;
  if (emailType !== "invite" && emailType !== "rejection") {
    return NextResponse.json({ error: "emailType must be 'invite' or 'rejection'" }, { status: 400 });
  }

  const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.candidateId, candidateId))
    .orderBy(desc(evaluations.createdAt))
    .limit(1);
  if (!evaluation) {
    return NextResponse.json({ error: "No evaluation found for this candidate" }, { status: 404 });
  }

  const candidateEvaluation = toCandidateEvaluation(evaluation, candidate.roleId as Role);
  const draft = await generateEmailDraft(candidateEvaluation, emailType);

  const [row] = await db
    .insert(emailDrafts)
    .values({
      candidateId,
      evaluationId: evaluation.id,
      emailType,
      subject: draft.subject,
      bodyTemplate: draft.body,
    })
    .returning();

  await db
    .update(candidates)
    .set({ decision: emailType === "invite" ? "interview" : "reject" })
    .where(eq(candidates.id, candidateId));

  return NextResponse.json({ draft: row });
}
