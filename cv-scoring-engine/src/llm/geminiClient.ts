import {
  GEMINI_HISTORICAL_FIT_ONLY_SCHEMA,
  GEMINI_RESPONSE_SCHEMA,
  historicalFitOnlyResponseSchema,
  llmEvaluationResponseSchema,
} from "./schema.js";
import type { LLMEvaluationResponse } from "../types.js";
import type { z } from "zod";

const DEFAULT_MODEL = "gemini-flash-latest";

export async function callGemini(
  prompt: string,
  responseSchema: object,
): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set. Add it to your environment (see .env.example).",
    );
  }
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error(`Gemini response had no text content: ${JSON.stringify(data)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Gemini response was not valid JSON: ${text}`);
  }
}

export async function callGeminiForEvaluation(
  prompt: string,
): Promise<LLMEvaluationResponse> {
  const parsed = await callGemini(prompt, GEMINI_RESPONSE_SCHEMA);
  const result = llmEvaluationResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Gemini response did not match the expected schema: ${result.error.message}`,
    );
  }
  return result.data;
}

export async function callGeminiForHistoricalFitOnly(
  prompt: string,
): Promise<z.infer<typeof historicalFitOnlyResponseSchema>> {
  const parsed = await callGemini(prompt, GEMINI_HISTORICAL_FIT_ONLY_SCHEMA);
  const result = historicalFitOnlyResponseSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Gemini response did not match the expected schema: ${result.error.message}`,
    );
  }
  return result.data;
}
