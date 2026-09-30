import type { CandidateEvaluation } from "cv-scoring-engine";

export type RoutingDecision = "review_queue" | "screening_queue";

export interface RoutingResult {
  decision: RoutingDecision;
  // Always phrased as a routing/attention outcome, never a verdict on the
  // candidate ("scored below threshold, routed away from review queue" —
  // never "this is a bad candidate").
  reason: string;
}

export function computeRouting(
  evaluation: CandidateEvaluation,
  threshold: number,
): RoutingResult {
  if (evaluation.eligibility.status === "Not eligible") {
    return {
      decision: "screening_queue",
      reason: `Ineligible: ${evaluation.eligibility.hardRequirementIssues.join("; ")}`,
    };
  }

  const score = evaluation.overallTotal?.score ?? 0;

  if (score >= threshold) {
    return {
      decision: "review_queue",
      reason: `Scored ${score}/100, at or above the current screening threshold of ${threshold}.`,
    };
  }

  return {
    decision: "screening_queue",
    reason: `Scored ${score}/100, below the current screening threshold of ${threshold}. Routed to the screening queue for a quick glance rather than full review — this reflects attention priority, not a judgment that the candidate is unqualified.`,
  };
}
