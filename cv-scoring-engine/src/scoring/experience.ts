import type { WorkHistoryEntry } from "../types.js";

// Parses "YYYY-MM" (or "present", case-insensitive) into a month index
// (year * 12 + month), anchoring "present" to the caller-supplied reference
// date rather than trusting the LLM to know today's date.
function toMonthIndex(dateStr: string, referenceDate: Date): number {
  if (dateStr.trim().toLowerCase() === "present") {
    return referenceDate.getFullYear() * 12 + (referenceDate.getMonth() + 1);
  }
  const match = /^(\d{4})-(\d{2})$/.exec(dateStr.trim());
  if (!match) return NaN;
  return Number(match[1]) * 12 + Number(match[2]);
}

// Computes total years spent in PM/SPM-titled roles from structured work
// history, merging overlapping or adjacent date ranges so concurrent roles
// aren't double-counted. Deterministic and auditable, unlike asking an LLM to
// self-report a running total across possibly-overlapping entries.
export function computeTotalYearsPMExperience(
  workHistory: WorkHistoryEntry[],
  referenceDate: Date = new Date(),
): number {
  const intervals = workHistory
    .filter((entry) => entry.isPMRole)
    .map((entry) => ({
      start: toMonthIndex(entry.startDate, referenceDate),
      end: toMonthIndex(entry.endDate, referenceDate),
    }))
    .filter((i) => Number.isFinite(i.start) && Number.isFinite(i.end) && i.end >= i.start)
    .sort((a, b) => a.start - b.start);

  let totalMonths = 0;
  let currentStart: number | null = null;
  let currentEnd: number | null = null;

  for (const interval of intervals) {
    if (currentStart === null) {
      currentStart = interval.start;
      currentEnd = interval.end;
      continue;
    }
    if (interval.start <= (currentEnd as number) + 1) {
      // Overlapping or adjacent — extend the merged range instead of adding a
      // second, double-counted interval.
      currentEnd = Math.max(currentEnd as number, interval.end);
    } else {
      totalMonths += (currentEnd as number) - currentStart + 1;
      currentStart = interval.start;
      currentEnd = interval.end;
    }
  }
  if (currentStart !== null) {
    totalMonths += (currentEnd as number) - currentStart + 1;
  }

  return Math.round((totalMonths / 12) * 10) / 10;
}
