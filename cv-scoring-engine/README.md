# Kargo CV Scoring Engine

Implements `kargo_cv_validation_rubric.md`: eligibility gate + 70-point historical
Kargo-fit + 30-point PM/SPM JD-fit, with evidence, gaps, and interview probes.
This is the scoring layer only (see "Out of scope" below).

## Setup

```
npm install
cp .env.example .env   # fill in GEMINI_API_KEY
```

## Usage

```
npm run evaluate -- <path-to-cv.docx|.pdf|.txt> <PM|SPM> [--json out.json] [--md out.md]
npm run calibrate       # sanity-checks scoring against the 8 historical hires
```

With no `--json`/`--md`, `evaluate` prints the markdown report to stdout.

## Architecture

- `src/config/rubric.ts`, `src/config/jobDescriptions.ts` — the rubric and both
  JDs as structured data, not prompt prose. Edit these, not the prompt, when
  the rubric or JD text changes.
- `src/ingestion/extractText.ts` — normalizes docx/pdf/txt CVs to plain text.
- `src/llm/` — prompt construction, Gemini API call, and schema validation
  (Gemini's `responseSchema` constrains generation; a mirrored zod schema
  validates the parsed result, since a schema constrains shape but not
  correctness).
- `src/scoring/eligibility.ts` — deterministic hard-requirement gate (rubric
  §4), run on extracted facts rather than left to LLM judgment.
- `src/scoring/experience.ts` — deterministic years-of-PM-experience
  calculation from structured work history (merges overlapping date ranges).
  The LLM extracts *dates*; code does the *arithmetic* — an LLM asked to
  self-report a running total across "present"-ended, possibly-overlapping
  roles has no reliable notion of today's date and no arithmetic guarantee.
- `src/scoring/aggregate.ts` — attaches fixed rubric weights, clamps
  out-of-range scores, computes totals. No overall total is computed for an
  ineligible candidate (rubric §4: a high fit score must not visually
  compensate for an eligibility failure).
- `src/output/toMarkdown.ts` — renders rubric §6's exact template.
- `src/cli.ts` / `src/calibrate.ts` — entry points.
- `src/scoring/evaluateCandidate.ts` exports `evaluateCandidateFile` /
  `evaluateCandidateText` — the function later automation (dashboard, ranking,
  email drafting) should call directly instead of shelling out to the CLI.

## Hard-requirement interpretation (confirmed with the user)

Neither JD states requirements as an explicit "must-have" gate — everything
reads as descriptive ("ideally," "comfort operating," "genuine advantage").
Only two concrete, binary-checkable lines are treated as hard eligibility
gates: **years-of-PM-experience** (2–4 for PM, 5–8 for SPM) and
**Mumbai-based / willing to relocate, in-office**. Everything else under
"What We're Looking For" is scored within the 30-point JD-fit layer instead.
Missing/unclear relocation signal is treated as a non-blocking gap (rubric §5:
absence of evidence isn't evidence of absence), not an automatic fail.

## Calibration finding (needs a decision, not silently patched)

Running `npm run calibrate` against the 8 historical hires shows the five
Exceeds-Expectations hires scoring 60–68/70 and the two Meets-Expectations
hires scoring 50–53/70 — but Preetham Rao, the excluded Below-Expectations
hire (negative control), scores 55/70, in between rather than clearly lowest.

Per-criterion inspection shows why: his CV genuinely displays strong
ownership, ground-level operational exposure (e-commerce fulfilment,
logistics-provider integrations), and problem→action→outcome evidence — the
same CV-visible pattern the rubric is designed to detect. His weaker areas
(learning/adaptation, cross-functional execution) are comparable to, not
worse than, the two Meets-Expectations hires.

This is consistent with rubric §8's own limitation ("this is a positive-
pattern calibration, not a predictive model... a low score should not be
read as predicting failure") and with §5 ("evaluate evidence visible in the
CV, not infer personality or intent"): a Below-Expectations outcome plausibly
stems from factors a CV cannot show (collaboration friction, judgment on the
job, execution quality) rather than from a weaker CV pattern. The scoring
logic was not tuned to force separation on this single data point, since
doing so would mean reverse-engineering rubric weights from one negative
example rather than implementing the rubric as specified — that's a decision
for whoever owns the rubric, not something to patch silently.

Raw evidence/reasoning for all 8 hires is in `calibration-results.json`
(gitignored, regenerated each run) for review.

## Out of scope (per instruction)

CV upload UI, cross-candidate ranking/dashboard persistence, and the
Resend email drafting/sending shown in the case's components-map diagram.
`evaluateCandidateFile`/`evaluateCandidateText` are the integration points for
that later work.
