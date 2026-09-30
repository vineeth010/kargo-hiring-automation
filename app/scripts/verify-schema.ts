// Applies the generated migration SQL to a throwaway in-memory Postgres
// (pglite — NOT Neon) to prove the DDL is valid before we ever touch a real
// database, then does a couple of sanity inserts through Drizzle itself.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { readFileSync, readdirSync } from "node:fs";
import * as schema from "../src/db/schema";

async function main() {
  const client = new PGlite();
  const migrationFiles = readdirSync("./drizzle").filter((f) => f.endsWith(".sql"));
  for (const file of migrationFiles) {
    const sql = readFileSync(`./drizzle/${file}`, "utf-8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
  console.log(`PASS  Applied ${migrationFiles.length} migration file(s) to pglite with no errors`);

  const db = drizzle(client, { schema });

  await db.insert(schema.roles).values([
    { id: "PM", title: "Product Manager" },
    { id: "SPM", title: "Senior Product Manager" },
  ]);
  const [candidate] = await db
    .insert(schema.candidates)
    .values({ roleId: "PM" })
    .returning();
  console.log("PASS  Inserted a candidate row:", candidate.id, candidate.status, candidate.decision);

  await db.insert(schema.candidateIdentities).values({
    candidateId: candidate.id,
    fullName: "Test Candidate",
    email: "test@example.com",
    phone: null,
  });
  const identities = await db.select().from(schema.candidateIdentities);
  console.log("PASS  Read back identity row:", identities.length === 1 ? "OK" : "MISMATCH");

  // Cascade delete check: deleting the candidate should remove the identity too.
  await db.delete(schema.candidates).where(eq(schema.candidates.id, candidate.id));
  const remaining = await db.select().from(schema.candidateIdentities);
  console.log(
    remaining.length === 0
      ? "PASS  ON DELETE CASCADE correctly removed the identity row when the candidate was deleted"
      : "FAIL  identity row survived candidate deletion — cascade not working",
  );

  // --- Exercise the exact query/update shapes used by queries.ts and the
  // promote route handler, against real Postgres semantics (pglite), to
  // validate the review/screening queue split and the promote action.
  const [rubricVersion] = await db
    .insert(schema.rubricVersions)
    .values({ versionLabel: "test-v1", historicalFitConfig: {}, jdFitConfig: {} })
    .returning();

  async function insertScoredCandidate(routingDecision: "review_queue" | "screening_queue", name: string) {
    const [c] = await db.insert(schema.candidates).values({ roleId: "PM" }).returning();
    await db.insert(schema.candidateIdentities).values({ candidateId: c.id, fullName: name, email: null, phone: null });
    const [e] = await db
      .insert(schema.evaluations)
      .values({
        candidateId: c.id,
        rubricVersionId: rubricVersion.id,
        extractedFacts: {},
        eligibilityStatus: "Eligible",
        historicalFit: {},
        historicalFitTotal: 50,
        jdFit: {},
        overallScore: routingDecision === "review_queue" ? 80 : 40,
        rankingRationale: "test",
        routingDecision,
        routingReason: "test",
        screeningThresholdUsed: 60,
      })
      .returning();
    return { candidateId: c.id, evaluationId: e.id };
  }

  await insertScoredCandidate("review_queue", "Above Threshold");
  const below = await insertScoredCandidate("screening_queue", "Below Threshold");

  const reviewQueue = await db
    .select({ name: schema.candidateIdentities.fullName })
    .from(schema.candidates)
    .innerJoin(schema.candidateIdentities, eq(schema.candidateIdentities.candidateId, schema.candidates.id))
    .innerJoin(schema.evaluations, eq(schema.evaluations.candidateId, schema.candidates.id))
    .where(eq(schema.evaluations.routingDecision, "review_queue"));
  const screeningQueueRows = await db
    .select({ name: schema.candidateIdentities.fullName })
    .from(schema.candidates)
    .innerJoin(schema.candidateIdentities, eq(schema.candidateIdentities.candidateId, schema.candidates.id))
    .innerJoin(schema.evaluations, eq(schema.evaluations.candidateId, schema.candidates.id))
    .where(eq(schema.evaluations.routingDecision, "screening_queue"));

  console.log(
    reviewQueue.length === 1 && reviewQueue[0].name === "Above Threshold"
      ? "PASS  Review queue query returns exactly the above-threshold candidate"
      : `FAIL  Review queue query returned: ${JSON.stringify(reviewQueue)}`,
  );
  console.log(
    screeningQueueRows.length === 1 && screeningQueueRows[0].name === "Below Threshold"
      ? "PASS  Screening queue query returns exactly the below-threshold candidate"
      : `FAIL  Screening queue query returned: ${JSON.stringify(screeningQueueRows)}`,
  );

  // Promote: flip the below-threshold candidate's routing_decision, exactly
  // as the /promote route handler does.
  await db
    .update(schema.evaluations)
    .set({ routingDecision: "review_queue", manuallyPromoted: true, promotedAt: new Date() })
    .where(eq(schema.evaluations.id, below.evaluationId));

  const [promoted] = await db
    .select({ routingDecision: schema.evaluations.routingDecision, manuallyPromoted: schema.evaluations.manuallyPromoted })
    .from(schema.evaluations)
    .where(eq(schema.evaluations.id, below.evaluationId));
  console.log(
    promoted.routingDecision === "review_queue" && promoted.manuallyPromoted
      ? "PASS  Promote correctly flips routing_decision to review_queue and sets manuallyPromoted"
      : `FAIL  Promote did not update correctly: ${JSON.stringify(promoted)}`,
  );
}

main().catch((err) => {
  console.error("FAIL", err);
  process.exit(1);
});
