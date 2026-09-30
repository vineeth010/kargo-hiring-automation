import { HISTORICAL_FIT_CRITERIA } from "../config/rubric.js";
import type { CandidateEvaluation } from "../types.js";

// Renders a CandidateEvaluation in the exact shape of rubric §6 ("Expected AI
// Output"), so the report Arjun reads is traceable line-for-line back to the
// spec he agreed to.
export function toMarkdown(evaluation: CandidateEvaluation): string {
  const lines: string[] = [];

  lines.push(`## Candidate`, "", `\`${evaluation.candidateName}\``, "");
  lines.push(`### Eligibility`, "");
  lines.push(`- Status: ${evaluation.eligibility.status}`);
  lines.push(
    `- Hard requirement issues: ${
      evaluation.eligibility.hardRequirementIssues.length
        ? evaluation.eligibility.hardRequirementIssues.join("; ")
        : "None"
    }`,
  );
  lines.push("");

  lines.push(`### Historical Kargo-fit`, "");
  lines.push(
    `**Score: ${evaluation.historicalFitTotal.score} / ${evaluation.historicalFitTotal.maxScore}**`,
    "",
  );
  for (const criterion of HISTORICAL_FIT_CRITERIA) {
    const c = evaluation.historicalFit[criterion.key];
    lines.push(`#### ${criterion.label} — ${c.score} / ${c.maxScore}`, "");
    lines.push(
      `- Evidence from CV: ${c.evidence.length ? c.evidence.map((e) => `"${e}"`).join("; ") : "None found"}`,
    );
    lines.push(`- Reasoning: ${c.reasoning}`, "");
  }

  lines.push(`### Role / JD fit`, "");
  lines.push(`**Score: ${evaluation.jdFit.score} / ${evaluation.jdFit.maxScore}**`, "");
  lines.push(
    `- Relevant experience: ${evaluation.jdFit.relevantExperience.join("; ") || "None noted"}`,
  );
  lines.push(`- Strong matches: ${evaluation.jdFit.strongMatches.join("; ") || "None noted"}`);
  lines.push(`- Relevant gaps: ${evaluation.jdFit.relevantGaps.join("; ") || "None noted"}`, "");

  lines.push(`### Overall`, "");
  lines.push(
    evaluation.overallTotal
      ? `**Total: ${evaluation.overallTotal.score} / ${evaluation.overallTotal.maxScore}**`
      : "**Total: N/A — candidate is not eligible; historical-fit and JD-fit scores above are informational only.**",
    "",
  );

  lines.push(`### Why this candidate ranked here`, "");
  lines.push(evaluation.rankingRationale, "");

  lines.push(`### Gaps / uncertainty`, "");
  for (const gap of evaluation.gapsAndUncertainty) lines.push(`- ${gap}`);
  lines.push("");

  lines.push(`### Interview probes`, "");
  for (const p of evaluation.interviewProbes) {
    lines.push(`> **Probe:** ${p.probe}`);
    lines.push(`> ${p.rationale}`, "");
  }

  return lines.join("\n");
}
