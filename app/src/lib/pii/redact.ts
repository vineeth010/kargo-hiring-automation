// Deterministic, local PII detection and redaction. This runs BEFORE any text
// reaches cv-scoring-engine (and therefore before it can reach Gemini) — it
// must never call an LLM itself, since sending raw CV text to a model in
// order to ask "which parts are PII?" would defeat the entire point of this
// module. Regex/heuristic only, with known limitations documented inline.

export interface RedactedCv {
  identity: {
    fullName: string;
    email: string | null;
    phone: string | null;
  };
  redactedText: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Targets the Indian mobile formats seen across this dataset (e.g.
// "+91 98204 37810", "9820437810", "98204-37810"). Not exhaustive for every
// international format — a known limitation of a regex-only approach.
const PHONE_RE = /(\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g;

const LINK_RE = /(https?:\/\/)?(www\.)?(linkedin\.com\/in\/[a-zA-Z0-9-]+|github\.com\/[a-zA-Z0-9-]+)/gi;

function looksLikeName(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (trimmed.includes("@")) return false;
  if (/https?:\/\//i.test(trimmed) || /\.(com|in|io|org)\b/i.test(trimmed)) return false;
  if (PHONE_RE.test(trimmed)) return false;
  PHONE_RE.lastIndex = 0; // reset (global regex with .test keeps state)
  const words = trimmed.split(/\s+/);
  if (words.length === 0 || words.length > 5) return false;
  // Mostly alphabetic words (allow periods/hyphens for initials/compound names).
  return words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w));
}

function extractName(text: string): string {
  const lines = text.split("\n").slice(0, 6);
  for (const line of lines) {
    if (looksLikeName(line)) return line.trim();
  }
  return "Candidate";
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function redactCv(rawText: string): RedactedCv {
  const emailMatch = rawText.match(EMAIL_RE);
  const phoneMatch = rawText.match(PHONE_RE);
  const fullName = extractName(rawText);

  let redacted = rawText;
  redacted = redacted.replace(EMAIL_RE, "[EMAIL]");
  redacted = redacted.replace(PHONE_RE, "[PHONE]");
  redacted = redacted.replace(LINK_RE, "[LINK]");

  // Redact the full name AND each individual name part (first name, last
  // name, ...) wherever they appear as a whole word elsewhere in the
  // document — e.g. a manager-quote bullet referring to the candidate by
  // first name only ("Lavanya is the first PM here who...") would otherwise
  // survive a full-string-only replace. Over-redaction (an unrelated word
  // that happens to match a short name part) is an acceptable trade-off
  // against a PII leak.
  if (fullName !== "Candidate") {
    const nameParts = fullName.split(/\s+/).filter((p) => p.length > 1);
    for (const part of nameParts) {
      const wordRe = new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi");
      redacted = redacted.replace(wordRe, "[CANDIDATE]");
    }
  }

  return {
    identity: {
      fullName,
      email: emailMatch?.[0] ?? null,
      phone: phoneMatch?.[0] ?? null,
    },
    redactedText: redacted,
  };
}
