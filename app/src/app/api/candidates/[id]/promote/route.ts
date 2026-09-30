import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { evaluations } from "@/db/schema";

// One-click override: Arjun recognizes a referral, or sees something the
// rubric didn't capture, and pulls a candidate out of the screening queue
// into full review — without needing to re-score anything.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: candidateId } = await params;

  const [evaluation] = await db
    .select({ id: evaluations.id })
    .from(evaluations)
    .where(eq(evaluations.candidateId, candidateId))
    .orderBy(desc(evaluations.createdAt))
    .limit(1);

  if (!evaluation) {
    return NextResponse.json({ error: "No evaluation found for this candidate" }, { status: 404 });
  }

  await db
    .update(evaluations)
    .set({ routingDecision: "review_queue", manuallyPromoted: true, promotedAt: new Date() })
    .where(eq(evaluations.id, evaluation.id));

  return NextResponse.json({ ok: true });
}
