import { Resend } from "resend";

export interface SendEmailResult {
  resendMessageId: string;
}

// Test-mode redirect: per the course build checkpoints, all sends during
// development/testing go to a single test inbox regardless of the real
// candidate's address, so nothing real ever gets emailed while the pipeline
// is being verified. Set EMAIL_TEST_MODE=false once ready for real sends.
function resolveRecipient(realEmail: string | null): string {
  const testMode = process.env.EMAIL_TEST_MODE !== "false";
  if (testMode) {
    const testRecipient = process.env.EMAIL_TEST_RECIPIENT;
    if (!testRecipient) {
      throw new Error(
        "EMAIL_TEST_MODE is on but EMAIL_TEST_RECIPIENT is not set. Add it to app/.env.local.",
      );
    }
    return testRecipient;
  }
  if (!realEmail) {
    throw new Error("Candidate has no email on file and EMAIL_TEST_MODE is off.");
  }
  return realEmail;
}

export async function sendEmail(params: {
  candidateEmail: string | null;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set. Add it to app/.env.local.");
  }
  const from = process.env.RESEND_FROM_EMAIL;
  if (!from) {
    throw new Error("RESEND_FROM_EMAIL is not set. Add it to app/.env.local.");
  }

  const resend = new Resend(apiKey);
  const to = resolveRecipient(params.candidateEmail);

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject: params.subject,
    text: params.body,
  });

  if (error || !data) {
    throw new Error(`Resend send failed: ${error?.message ?? "unknown error"}`);
  }

  return { resendMessageId: data.id };
}
