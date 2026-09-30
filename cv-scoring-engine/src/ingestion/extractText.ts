import { readFile } from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

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
