import "dotenv/config";
import { writeFile } from "node:fs/promises";
import { evaluateCandidateFile } from "./scoring/evaluateCandidate.js";
import { toMarkdown } from "./output/toMarkdown.js";
import type { Role } from "./types.js";

// Usage: npm run evaluate -- <cv-file> <PM|SPM> [--json out.json] [--md out.md]
async function main() {
  const [cvPath, roleArg, ...rest] = process.argv.slice(2);

  if (!cvPath || (roleArg !== "PM" && roleArg !== "SPM")) {
    console.error("Usage: npm run evaluate -- <cv-file> <PM|SPM> [--json out.json] [--md out.md]");
    process.exit(1);
  }
  const role = roleArg as Role;

  const jsonOutIndex = rest.indexOf("--json");
  const mdOutIndex = rest.indexOf("--md");
  const jsonOutPath = jsonOutIndex >= 0 ? rest[jsonOutIndex + 1] : undefined;
  const mdOutPath = mdOutIndex >= 0 ? rest[mdOutIndex + 1] : undefined;

  const evaluation = await evaluateCandidateFile(cvPath, role);
  const markdown = toMarkdown(evaluation);

  if (jsonOutPath) {
    await writeFile(jsonOutPath, JSON.stringify(evaluation, null, 2), "utf-8");
    console.log(`Wrote JSON evaluation to ${jsonOutPath}`);
  }
  if (mdOutPath) {
    await writeFile(mdOutPath, markdown, "utf-8");
    console.log(`Wrote markdown evaluation to ${mdOutPath}`);
  }
  if (!jsonOutPath && !mdOutPath) {
    console.log(markdown);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
