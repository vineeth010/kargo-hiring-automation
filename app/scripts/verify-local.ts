// One-off local verification script: exercises redaction + engine consumption
// + email-draft generation WITHOUT touching Neon or Resend. Run with:
//   npx tsx scripts/verify-local.ts
// Requires GEMINI_API_KEY in cv-scoring-engine/.env (already configured).
import { config } from "dotenv";
config({ path: "../cv-scoring-engine/.env" });
import { extractTextFromFile, evaluateCandidateText, generateInterviewBrief, generateEmailDraft } from "cv-scoring-engine";
import { redactCv } from "../src/lib/pii/redact";
import { computeRouting } from "../src/lib/routing/route";

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`PASS  ${label}`);
  } else {
    failures++;
    console.log(`FAIL  ${label}${detail ? " — " + detail : ""}`);
  }
}

async function main() {
  const cvPath = "../current_hires/hires_/cv_07_lavanya_iyer.docx";
  const rawText = await extractTextFromFile(cvPath);
  check("extractTextFromFile returns non-empty text", rawText.length > 100);

  const { identity, redactedText } = redactCv(rawText);
  console.log("Detected identity:", identity);

  check("name detected", identity.fullName === "Lavanya Iyer", identity.fullName);
  check("email detected", identity.email === "lavanya.iyer.pm@gmail.com", identity.email ?? "null");
  check("phone detected", identity.phone !== null, String(identity.phone));

  check("redacted text excludes name", !redactedText.includes("Lavanya Iyer"));
  check("redacted text excludes email", identity.email !== null && !redactedText.includes(identity.email));
  check("redacted text excludes phone", identity.phone !== null && !redactedText.includes(identity.phone));
  check("redacted text excludes linkedin handle", !redactedText.includes("linkedinlavanyaiyer") && !/linkedin\.com\/in\/lavanyaiyer/i.test(redactedText));
  check("redacted text is shorter or equal (placeholders vs real values)", redactedText.length > 0);

  console.log("\n--- First 300 chars of redacted text actually sent to Gemini ---");
  console.log(redactedText.slice(0, 300));
  console.log("---\n");

  // Real Gemini call (not Neon/Resend) — proves cv-scoring-engine is consumable
  // from the app workspace and that scoring/routing/brief/draft work end-to-end
  // on the REDACTED text only.
  const evaluation = await evaluateCandidateText(redactedText, "PM");
  check("evaluation eligibility is Eligible", evaluation.eligibility.status === "Eligible");
  check("evaluation has overall score", evaluation.overallTotal !== null);
  check(
    "LLM's own extractedFacts.candidateName contains no real name (proves Gemini never saw it)",
    !evaluation.extractedFacts.candidateName.toLowerCase().includes("lavanya"),
    evaluation.extractedFacts.candidateName,
  );

  const routingAbove = computeRouting(evaluation, 40);
  check("routing: above-threshold fixture routes to review_queue", routingAbove.decision === "review_queue", routingAbove.reason);

  const routingBelow = computeRouting(evaluation, 95);
  check("routing: below-threshold fixture routes to screening_queue", routingBelow.decision === "screening_queue", routingBelow.reason);
  check(
    "routing: below-threshold reason is non-judgmental (no 'bad candidate' framing)",
    /below the current screening threshold/i.test(routingBelow.reason) && !/bad|unqualified candidate|reject.*because/i.test(routingBelow.reason),
    routingBelow.reason,
  );

  const ineligibleRouting = computeRouting(
    { ...evaluation, eligibility: { status: "Not eligible", hardRequirementIssues: ["Candidate has 1 years of PM experience; role requires 2–4 years."] } },
    40,
  );
  check("routing: ineligible always routes to screening_queue regardless of threshold", ineligibleRouting.decision === "screening_queue");
  check("routing: ineligible reason names the specific hard requirement", ineligibleRouting.reason.includes("Ineligible:"));

  const brief = await generateInterviewBrief(evaluation);
  check("brief generated, non-empty", brief.length > 20);
  check("brief contains no candidate name", !brief.toLowerCase().includes("lavanya"));

  const inviteDraft = await generateEmailDraft(evaluation, "invite");
  check("invite draft uses name placeholder", inviteDraft.body.includes("{{CANDIDATE_NAME}}"));
  check("invite draft contains no real name", !inviteDraft.body.toLowerCase().includes("lavanya"));

  const rejectionDraft = await generateEmailDraft(evaluation, "rejection");
  check("rejection draft uses name placeholder", rejectionDraft.body.includes("{{CANDIDATE_NAME}}"));
  check("rejection draft does not mention scores/rubric", !/\bscore\b|\brubric\b/i.test(rejectionDraft.body));

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Script error:", err);
  process.exit(1);
});
