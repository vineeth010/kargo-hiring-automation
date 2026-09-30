import { extractTextFromFile } from "cv-scoring-engine";
import { redactCv } from "../src/lib/pii/redact";
import { readdir } from "node:fs/promises";
import path from "node:path";

async function main() {
  const dir = "../current_hires/hires_";
  const files = (await readdir(dir)).filter((f) => f.endsWith(".docx"));
  let failures = 0;

  for (const file of files) {
    const rawText = await extractTextFromFile(path.join(dir, file));
    const { identity, redactedText } = redactCv(rawText);
    const nameParts = identity.fullName.split(/\s+/).filter((p) => p.length > 1);
    const leaks: string[] = [];
    for (const part of nameParts) {
      if (new RegExp(`\\b${part}\\b`, "i").test(redactedText)) leaks.push(`name part "${part}"`);
    }
    if (identity.email && redactedText.includes(identity.email)) leaks.push("email");
    if (identity.phone && redactedText.includes(identity.phone)) leaks.push("phone");

    if (leaks.length > 0) {
      failures++;
      console.log(`FAIL ${file} (${identity.fullName}): leaked ${leaks.join(", ")}`);
    } else {
      console.log(`PASS ${file} (${identity.fullName}): clean`);
    }
  }
  console.log(failures === 0 ? "\nALL CVs CLEAN" : `\n${failures} CV(S) LEAKED PII`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
