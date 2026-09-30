// B.1 validation: runs the three synthetic test CVs (test-fixtures/) through
// the real processCandidate() pipeline against the real Neon database, then
// reports each candidate's full result. Test data is LEFT in Neon afterward
// (unlike the earlier smoke test) so it can be inspected live via
// `npm run dev`. Resend is not configured and is never called by this flow.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { readFile } = await import("node:fs/promises");
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../src/db/client");
  const { candidates, candidateIdentities, evaluations } = await import("../src/db/schema");
  const { processCandidate } = await import("../src/lib/pipeline/processCandidate");
  const { getQueue, getCandidateDetail } = await import("../src/lib/queries");

  const cases: { file: string; role: "PM" | "SPM"; label: string }[] = [
    { file: "cv_1_strong_pm.txt", role: "PM", label: "Clearly strong PM" },
    { file: "cv_2_weak_spm.txt", role: "SPM", label: "Clearly weak SPM" },
    { file: "cv_3_ambiguous_spm.txt", role: "SPM", label: "Ambiguous SPM" },
  ];

  const results: { label: string; candidateId: string }[] = [];

  for (const c of cases) {
    console.log(`\n=== Processing: ${c.label} (${c.file}, role=${c.role}) ===`);
    const fileBuffer = await readFile(`test-fixtures/${c.file}`);
    const { candidateId } = await processCandidate({
      role: c.role,
      fileBuffer,
      originalFilename: c.file,
      mimeType: "text/plain",
    });
    results.push({ label: c.label, candidateId });
    console.log(`candidateId: ${candidateId}`);
  }

  console.log("\n\n################ FULL REPORT ################");
  for (const r of results) {
    const detail = await getCandidateDetail(r.candidateId);
    if (!detail || !detail.evaluation) {
      console.log(`\n--- ${r.label}: NO EVALUATION FOUND (bug) ---`);
      continue;
    }
    const e = detail.evaluation;
    console.log(`\n--- ${r.label} ---`);
    console.log(`Name (from candidate_identities, never sent to Gemini): ${detail.identity?.fullName}`);
    console.log(`Role: ${detail.candidate.roleId}`);
    const hardRequirementIssues = e.hardRequirementIssues as string[];
    console.log(`Eligibility: ${e.eligibilityStatus}${hardRequirementIssues.length ? " (" + hardRequirementIssues.join("; ") + ")" : ""}`);
    console.log(`Historical Kargo-fit: ${e.historicalFitTotal}/70`);
    const jdFit = e.jdFit as { score: number; maxScore: number };
    console.log(`JD fit: ${jdFit.score}/${jdFit.maxScore}`);
    console.log(`Overall: ${e.overallScore !== null ? `${e.overallScore}/100` : "N/A (not eligible)"}`);
    console.log(`Routing: ${e.routingDecision} — ${e.routingReason}`);
    console.log(`Gaps/uncertainty: ${JSON.stringify(e.gapsAndUncertainty)}`);
    console.log(`Brief present: ${!!detail.brief}`);
    console.log(`Email drafts: ${detail.drafts.map((d) => `${d.emailType}:${d.status}`).join(", ") || "none"}`);
  }

  // --- Promote test: find a screening_queue candidate and promote it.
  const [screeningCandidate] = await db
    .select({ candidateId: candidates.id, evaluationId: evaluations.id, name: candidateIdentities.fullName })
    .from(evaluations)
    .innerJoin(candidates, eq(candidates.id, evaluations.candidateId))
    .innerJoin(candidateIdentities, eq(candidateIdentities.candidateId, candidates.id))
    .where(eq(evaluations.routingDecision, "screening_queue"))
    .limit(1);

  console.log("\n\n################ PROMOTE TEST ################");
  if (screeningCandidate) {
    console.log(`Promoting "${screeningCandidate.name}" from Screening Queue to Review Queue...`);
    await db
      .update(evaluations)
      .set({ routingDecision: "review_queue", manuallyPromoted: true, promotedAt: new Date() })
      .where(eq(evaluations.id, screeningCandidate.evaluationId));

    const stillInScreening = await getQueue("SPM", "screening_queue");
    const nowInReview = await getQueue("SPM", "review_queue");
    const foundInReview = nowInReview.some((r) => r.candidateId === screeningCandidate.candidateId);
    const foundInScreening = stillInScreening.some((r) => r.candidateId === screeningCandidate.candidateId);
    console.log(`After promote — appears in review_queue: ${foundInReview}, still in screening_queue: ${foundInScreening}`);
  } else {
    console.log("No candidate landed in the Screening Queue — nothing to promote-test.");
  }

  // --- Queue partition check across both roles.
  console.log("\n\n################ QUEUE PARTITION CHECK ################");
  for (const role of ["PM", "SPM"] as const) {
    const review = await getQueue(role, "review_queue");
    const screening = await getQueue(role, "screening_queue");
    console.log(
      `${role}: review_queue=[${review.map((r) => r.fullName).join(", ")}]  screening_queue=[${screening.map((r) => r.fullName).join(", ")}]`,
    );
  }

  console.log(
    "\nTest data left in Neon intentionally (not cleaned up) so it can be viewed via `npm run dev`. No Resend calls were made (RESEND_API_KEY is blank).",
  );
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
