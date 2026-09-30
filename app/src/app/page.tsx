import { Dashboard } from "@/components/Dashboard";
import { getQueue } from "@/lib/queries";
import { getAllScreeningThresholds } from "@/lib/settings";
import type { Role } from "cv-scoring-engine";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { role: roleParam } = await searchParams;
  const role: Role = roleParam === "SPM" ? "SPM" : "PM";

  const [reviewQueue, screeningQueue, thresholds] = await Promise.all([
    getQueue(role, "review_queue"),
    getQueue(role, "screening_queue"),
    getAllScreeningThresholds(),
  ]);

  return (
    <Dashboard
      role={role}
      reviewQueue={JSON.parse(JSON.stringify(reviewQueue))}
      screeningQueue={JSON.parse(JSON.stringify(screeningQueue))}
      thresholds={thresholds}
    />
  );
}
