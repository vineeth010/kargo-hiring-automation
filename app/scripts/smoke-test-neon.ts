// Real-DB smoke test: runs the ACTUAL processCandidate() pipeline (the same
// code the /api/candidates/upload route calls) against the real Neon
// database, using one fictional sample CV from current_hires/ (not one of
// the real applicant CVs — none have been uploaded yet, by instruction).
// Cleans up the test candidate afterward so the database is left empty.
import { config } from "dotenv";
config({ path: ".env.local" });

// Dynamic imports, deliberately: static `import` specifiers are hoisted and
// would evaluate (and throw, in db/client.ts) before the config() call above
// ever runs. This keeps the script self-contained without depending on
// callers remembering `--env-file`.
async function main() {
  const { readFile } = await import("node:fs/promises");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db/client");
  const { candidates, candidateIdentities, cvDocuments, evaluations, interviewBriefs, emailDrafts } = await import(
    "../src/db/schema"
  );
  const { processCandidate } = await import("../src/lib/pipeline/processCandidate");

  let failures = 0;
  const check = (label: string, condition: boolean, detail?: string) => {
    console.log(`${condition ? "PASS" : "FAIL"}  ${label}${detail ? " — " + detail : ""}`);
    if (!condition) failures++;
  };

  const fileBuffer = await readFile("../current_hires/hires_/cv_07_lavanya_iyer.docx");

  console.log("Running processCandidate() against the real Neon database...");
  const { candidateId } = await processCandidate({
    role: "PM",
    fileBuffer,
    originalFilename: "cv_07_lavanya_iyer.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  console.log("candidateId:", candidateId);

  const [candidate] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
  check("candidate row exists with status 'ready'", candidate?.status === "ready", candidate?.status);

  const [identity] = await db.select().from(candidateIdentities).where(eq(candidateIdentities.candidateId, candidateId));
  check("identity captured real name", identity?.fullName === "Lavanya Iyer", identity?.fullName);
  check("identity captured email", identity?.email === "lavanya.iyer.pm@gmail.com", identity?.email ?? "null");

  const [cvDoc] = await db.select().from(cvDocuments).where(eq(cvDocuments.candidateId, candidateId));
  check("raw_text stored with real name (for Arjun's own audit use)", cvDoc?.rawText.includes("Lavanya Iyer") ?? false);
  check("redacted_text (what Gemini saw) excludes the name", !(cvDoc?.redactedText.toLowerCase().includes("lavanya") ?? true));
  check("redacted_text excludes the email", !(cvDoc?.redactedText.includes("lavanya.iyer.pm@gmail.com") ?? true));

  const [evaluation] = await db.select().from(evaluations).where(eq(evaluations.candidateId, candidateId));
  check("evaluation stored, eligible", evaluation?.eligibilityStatus === "Eligible", evaluation?.eligibilityStatus);
  check("evaluation has an overall score", evaluation?.overallScore !== null, String(evaluation?.overallScore));
  check(
    `routed to '${evaluation?.routingDecision}' with reason recorded`,
    !!evaluation?.routingReason,
    evaluation?.routingReason,
  );

  const [brief] = await db.select().from(interviewBriefs).where(eq(interviewBriefs.evaluationId, evaluation!.id));
  check("interview brief generated", (brief?.briefText.length ?? 0) > 20);

  const drafts = await db.select().from(emailDrafts).where(eq(emailDrafts.candidateId, candidateId));
  check("exactly one email draft prepared automatically", drafts.length === 1, String(drafts.length));
  check("draft status is 'draft', NOT sent", drafts[0]?.status === "draft", drafts[0]?.status);
  check("draft body uses {{CANDIDATE_NAME}} placeholder, no real name", drafts[0]?.bodyTemplate.includes("{{CANDIDATE_NAME}}") ?? false);

  // Cleanup: remove the test candidate (cascades to identity/cv_documents/
  // evaluations/interview_briefs/email_drafts). Leaves roles + rubric_versions
  // in place — legitimate seed/config data, not test junk.
  await db.delete(candidates).where(eq(candidates.id, candidateId));
  const [afterDelete] = await db.select().from(candidates).where(eq(candidates.id, candidateId));
  check("cleanup: test candidate removed from Neon", afterDelete === undefined);

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED — Neon database left empty (no test data retained)" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
