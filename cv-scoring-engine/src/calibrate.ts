import "dotenv/config";
import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractTextFromFile } from "./ingestion/extractText.js";
import { buildHistoricalFitOnlyPrompt } from "./llm/prompt.js";
import { callGeminiForHistoricalFitOnly } from "./llm/geminiClient.js";
import { HISTORICAL_FIT_CRITERIA, HISTORICAL_FIT_MAX_SCORE } from "./config/rubric.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HIRES_DIR = path.resolve(__dirname, "../../current_hires/hires_");

// Known outcomes from the problem statement, keyed by CV filename, used only
// to sanity-check the scoring engine's output against the pattern it's
// supposed to reproduce. Preetham Rao (Below Expectations) is intentionally
// excluded from the rubric itself but included here as the negative control:
// if he doesn't score meaningfully lower than the Exceeds/Meets hires, the
// scoring logic needs work before it's trusted on real candidates.
const KNOWN_OUTCOMES: Record<string, string> = {
  "cv_01_rohan_desai.docx": "Exceeds Expectations",
  "cv_02_sunita_krishnamurthy.docx": "Exceeds Expectations",
  "cv_03_vikram_nair.docx": "Meets Expectations",
  "cv_04_aditya_shetty.docx": "Exceeds Expectations",
  "cv_05_preetham_rao.docx": "Below Expectations (excluded from rubric — negative control)",
  "cv_06_meghna_tiwari.docx": "Exceeds Expectations",
  "cv_07_lavanya_iyer.docx": "Exceeds Expectations",
  "cv_08_rahul_bose.docx": "Meets Expectations",
};

async function main() {
  const files = (await readdir(HIRES_DIR)).filter((f) => f.endsWith(".docx"));

  const rows: {
    file: string;
    outcome: string;
    name: string;
    total: number;
    perCriterion: Record<string, number>;
  }[] = [];
  const fullResults: unknown[] = [];

  for (const file of files) {
    const cvText = await extractTextFromFile(path.join(HIRES_DIR, file));
    const prompt = buildHistoricalFitOnlyPrompt(cvText);
    const result = await callGeminiForHistoricalFitOnly(prompt);
    fullResults.push({ file, ...result });

    const perCriterion: Record<string, number> = {};
    let total = 0;
    for (const c of HISTORICAL_FIT_CRITERIA) {
      const score = result.historicalFit[c.key].score;
      perCriterion[c.key] = score;
      total += score;
    }

    rows.push({
      file,
      outcome: KNOWN_OUTCOMES[file] ?? "unknown",
      name: result.candidateName,
      total,
      perCriterion,
    });

    console.log(`Scored ${file} (${result.candidateName}): ${total}/${HISTORICAL_FIT_MAX_SCORE}`);
  }

  const outPath = path.resolve(__dirname, "../calibration-results.json");
  await writeFile(outPath, JSON.stringify(fullResults, null, 2), "utf-8");
  console.log(`\nFull evidence/reasoning written to ${outPath}`);

  console.log("\n=== Calibration summary (historical Kargo-fit only) ===\n");
  const sorted = [...rows].sort((a, b) => b.total - a.total);
  const criterionHeader = HISTORICAL_FIT_CRITERIA.map((c) => c.key.slice(0, 8).padStart(9)).join(" ");
  console.log(`${"".padStart(3)}       ${"".padEnd(24)}  ${criterionHeader}`);
  for (const row of sorted) {
    const perCriterionStr = HISTORICAL_FIT_CRITERIA.map((c) =>
      row.perCriterion[c.key].toString().padStart(9),
    ).join(" ");
    console.log(
      `${row.total.toString().padStart(3)}/${HISTORICAL_FIT_MAX_SCORE}  ${row.name.padEnd(24)}  ${perCriterionStr}  ${row.outcome}`,
    );
  }

  console.log(
    "\nSanity check: the five Exceeds/two Meets hires should score meaningfully higher than the excluded Below Expectations hire (negative control). If they don't, the scoring logic (prompt, rubric config, or model choice) needs revisiting before running on real candidates.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
