import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  candidates,
  candidateIdentities,
  evaluations,
  interviewBriefs,
  emailDrafts,
} from "@/db/schema";
import type { Role } from "cv-scoring-engine";

// MVP simplification: assumes at most one evaluation per candidate (no
// re-scoring flow in this pass), so a direct join never fans out.

export async function getQueue(role: Role, queue: "review_queue" | "screening_queue") {
  const rows = await db
    .select({
      candidateId: candidates.id,
      status: candidates.status,
      decision: candidates.decision,
      fullName: candidateIdentities.fullName,
      evaluationId: evaluations.id,
      extractedFacts: evaluations.extractedFacts,
      overallScore: evaluations.overallScore,
      historicalFitTotal: evaluations.historicalFitTotal,
      eligibilityStatus: evaluations.eligibilityStatus,
      routingReason: evaluations.routingReason,
      manuallyPromoted: evaluations.manuallyPromoted,
    })
    .from(candidates)
    .innerJoin(candidateIdentities, eq(candidateIdentities.candidateId, candidates.id))
    .innerJoin(evaluations, eq(evaluations.candidateId, candidates.id))
    .where(and(eq(candidates.roleId, role), eq(evaluations.routingDecision, queue)))
    .orderBy(desc(evaluations.overallScore));

  return rows;
}

export async function getCandidateDetail(candidateId: string) {
  const [candidate] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, candidateId));
  if (!candidate) return null;

  const [identity] = await db
    .select()
    .from(candidateIdentities)
    .where(eq(candidateIdentities.candidateId, candidateId));

  const [evaluation] = await db
    .select()
    .from(evaluations)
    .where(eq(evaluations.candidateId, candidateId))
    .orderBy(desc(evaluations.createdAt))
    .limit(1);

  const brief = evaluation
    ? (
        await db
          .select()
          .from(interviewBriefs)
          .where(eq(interviewBriefs.evaluationId, evaluation.id))
      )[0]
    : null;

  const drafts = evaluation
    ? await db
        .select()
        .from(emailDrafts)
        .where(eq(emailDrafts.evaluationId, evaluation.id))
        .orderBy(desc(emailDrafts.createdAt))
    : [];

  return { candidate, identity, evaluation, brief, drafts };
}
