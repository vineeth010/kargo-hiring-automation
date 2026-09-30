import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { candidateIdentities, emailDrafts } from "@/db/schema";
import { renderEmailBody } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";

export const maxDuration = 30;

// The one place a real send happens — always an explicit, Arjun-initiated
// call from the dashboard's Confirm button. Never invoked automatically by
// the processing pipeline or the routing logic.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: candidateId } = await params;
  const body = (await request.json()) as {
    draftId: string;
    editedSubject?: string;
    editedBody?: string;
  };

  const [draft] = await db.select().from(emailDrafts).where(eq(emailDrafts.id, body.draftId));
  if (!draft || draft.candidateId !== candidateId) {
    return NextResponse.json({ error: "Draft not found for this candidate" }, { status: 404 });
  }
  if (draft.status === "sent") {
    return NextResponse.json({ error: "This draft has already been sent" }, { status: 409 });
  }

  const [identity] = await db
    .select()
    .from(candidateIdentities)
    .where(eq(candidateIdentities.candidateId, candidateId));
  if (!identity) {
    return NextResponse.json({ error: "Candidate identity not found" }, { status: 404 });
  }

  const subject = body.editedSubject ?? draft.subject;
  const bodyTemplate = body.editedBody ?? draft.bodyTemplate;
  const finalBody = renderEmailBody(bodyTemplate, identity.fullName);

  try {
    const result = await sendEmail({
      candidateEmail: identity.email,
      subject,
      body: finalBody,
    });

    const [updated] = await db
      .update(emailDrafts)
      .set({
        subject,
        bodyTemplate,
        status: "sent",
        resendMessageId: result.resendMessageId,
        sentAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(emailDrafts.id, draft.id))
      .returning();

    return NextResponse.json({ draft: updated });
  } catch (err) {
    await db
      .update(emailDrafts)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(emailDrafts.id, draft.id));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
