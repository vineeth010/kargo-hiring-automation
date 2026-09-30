import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { rubricVersions } from "@/db/schema";
import { HISTORICAL_FIT_CRITERIA, JOB_DESCRIPTIONS } from "cv-scoring-engine";

// The rubric/JD logic itself stays in cv-scoring-engine's code (source of
// truth, versioned via git — never modified here). This module just snapshots
// whatever the current config is into Neon, keyed by a content hash, so every
// evaluation can point at exactly which rubric version produced it. If the
// rubric config in code ever changes, a new hash (and therefore a new row)
// appears automatically the next time this runs — no migration or manual
// version bump required.
export async function getOrCreateCurrentRubricVersion(): Promise<string> {
  const historicalFitConfig = HISTORICAL_FIT_CRITERIA;
  // JOB_DESCRIPTIONS contains function values (hardRequirements[].check),
  // which JSON.stringify silently drops — fine here, since what we're
  // versioning is the human-readable configuration (weights, guidance,
  // descriptions), not the executable gate logic.
  const jdFitConfig = JOB_DESCRIPTIONS;

  const snapshot = { historicalFitConfig, jdFitConfig };
  const versionLabel = createHash("sha256")
    .update(JSON.stringify(snapshot))
    .digest("hex")
    .slice(0, 16);

  const [existing] = await db
    .select({ id: rubricVersions.id })
    .from(rubricVersions)
    .where(eq(rubricVersions.versionLabel, versionLabel));
  if (existing) return existing.id;

  const [created] = await db
    .insert(rubricVersions)
    .values({ versionLabel, historicalFitConfig, jdFitConfig })
    .onConflictDoNothing({ target: rubricVersions.versionLabel })
    .returning({ id: rubricVersions.id });

  if (created) return created.id;

  // Lost a race with a concurrent insert of the same version — read it back.
  const [row] = await db
    .select({ id: rubricVersions.id })
    .from(rubricVersions)
    .where(eq(rubricVersions.versionLabel, versionLabel));
  return row.id;
}
