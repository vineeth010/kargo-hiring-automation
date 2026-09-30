import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { appSettings } from "@/db/schema";
import type { Role } from "cv-scoring-engine";

// Configurable per role so PM and SPM applicant pools (which may have very
// different score distributions) can be tuned independently without a
// redeploy. Defaults are a starting point to tune once real score
// distributions are visible — see cv-scoring-engine/README.md's calibration
// notes on why a single "correct" number can't be derived up front.
const DEFAULT_THRESHOLD = 60;

function thresholdKey(role: Role): string {
  return `screening_threshold_${role}`;
}

export async function getScreeningThreshold(role: Role): Promise<number> {
  const [row] = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, thresholdKey(role)));
  return row ? Number(row.value) : DEFAULT_THRESHOLD;
}

export async function setScreeningThreshold(role: Role, value: number): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key: thresholdKey(role), value: String(value) })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: String(value), updatedAt: new Date() },
    });
}

export async function getAllScreeningThresholds(): Promise<Record<Role, number>> {
  const [pm, spm] = await Promise.all([
    getScreeningThreshold("PM"),
    getScreeningThreshold("SPM"),
  ]);
  return { PM: pm, SPM: spm };
}
