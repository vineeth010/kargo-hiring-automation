import { extractTextFromFile } from "../ingestion/extractText.js";
import { buildEvaluationPrompt } from "../llm/prompt.js";
import { callGeminiForEvaluation } from "../llm/geminiClient.js";
import { aggregateEvaluation } from "./aggregate.js";
import type { CandidateEvaluation, Role } from "../types.js";

// Single entry point: CV file path + target role in, fully-scored,
// rubric-shaped evaluation out. This is the function later automation
// (dashboard, ranking, email drafting) is expected to call.
export async function evaluateCandidateFile(
  cvFilePath: string,
  role: Role,
): Promise<CandidateEvaluation> {
  const cvText = await extractTextFromFile(cvFilePath);
  return evaluateCandidateText(cvText, role);
}

export async function evaluateCandidateText(
  cvText: string,
  role: Role,
): Promise<CandidateEvaluation> {
  const prompt = buildEvaluationPrompt(cvText, role);
  const llmResponse = await callGeminiForEvaluation(prompt);
  return aggregateEvaluation(llmResponse, role);
}
