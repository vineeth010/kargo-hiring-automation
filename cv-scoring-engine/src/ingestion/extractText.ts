import "./pdfPolyfill.js";
import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { getPath } from "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

// Per pdf-parse's own serverless-deployment guidance: in bundled/serverless
// environments (Vercel, Lambda, etc.) pdfjs-dist can fail to locate its
// worker script ("Setting up fake worker failed: Cannot find module
// '.../pdf.worker.mjs'") because bundlers rewrite module paths in ways its
// default auto-detection doesn't expect. Pointing it at the worker's real
// on-disk path explicitly avoids that.
PDFParse.setWorker(getPath());

// Normalizes a CV file (docx, pdf, or plain text) into raw text for the LLM.
// Mixed formats are expected (per the problem statement) so this dispatches
// on extension rather than assuming one format.
export async function extractTextFromFile(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  const buffer = await readFile(filePath);

  switch (ext) {
    case ".docx": {
      const result = await mammoth.extractRawText({ buffer });
      return result.value.trim();
    }
    case ".pdf": {
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text.trim();
    }
    case ".txt":
    case ".md":
      return buffer.toString("utf-8").trim();
    default:
      throw new Error(
        `Unsupported CV file type "${ext}" for ${filePath}. Supported: .docx, .pdf, .txt, .md`,
      );
  }
}
