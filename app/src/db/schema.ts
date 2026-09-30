import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// --- Enums -----------------------------------------------------------------

export const candidateStatusEnum = pgEnum("candidate_status", [
  "uploaded",
  "redacting",
  "scoring",
  "scored",
  "briefing",
  "drafting_email",
  "ready",
  "error",
]);

export const candidateDecisionEnum = pgEnum("candidate_decision", [
  "pending",
  "interview",
  "reject",
]);

export const eligibilityStatusEnum = pgEnum("eligibility_status", [
  "Eligible",
  "Not eligible",
]);

export const routingDecisionEnum = pgEnum("routing_decision", [
  "review_queue",
  "screening_queue",
]);

export const emailTypeEnum = pgEnum("email_type", ["invite", "rejection"]);

export const emailStatusEnum = pgEnum("email_status", [
  "draft",
  "sent",
  "failed",
]);

// --- Tables ------------------------------------------------------------------

// Reference table for the two roles Kargo hires for. Kept as a table (rather
// than just a TS union) so candidates/evaluations can FK against it cleanly,
// per the requirement to model "Roles" as its own concept.
export const roles = pgTable("roles", {
  id: text("id").primaryKey(), // 'PM' | 'SPM'
  title: text("title").notNull(),
});

// A versioned snapshot of the rubric + JD config (from cv-scoring-engine's
// src/config/*.ts) at the time it was used. The rubric/JD logic itself stays
// in code (source of truth, versioned via git) — this table exists purely so
// every evaluation can record *which* rubric produced it, satisfying "store
// the rubric version used for each candidate evaluation" without needing a
// migration every time the rubric config changes in code.
export const rubricVersions = pgTable("rubric_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  versionLabel: text("version_label").notNull().unique(),
  historicalFitConfig: jsonb("historical_fit_config").notNull(),
  jdFitConfig: jsonb("jd_fit_config").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const candidates = pgTable("candidates", {
  id: uuid("id").defaultRandom().primaryKey(),
  roleId: text("role_id")
    .notNull()
    .references(() => roles.id),
  status: candidateStatusEnum("status").notNull().default("uploaded"),
  decision: candidateDecisionEnum("decision").notNull().default("pending"),
  processingError: text("processing_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// PII lives here, and only here (plus the raw CV text below). Never joined
// into anything sent to Gemini.
export const candidateIdentities = pgTable("candidate_identities", {
  candidateId: uuid("candidate_id")
    .primaryKey()
    .references(() => candidates.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const cvDocuments = pgTable("cv_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  originalFilename: text("original_filename").notNull(),
  mimeType: text("mime_type").notNull(),
  // Original extracted text, PII included — stored for Arjun's own audit/
  // reference use, never sent to Gemini.
  rawText: text("raw_text").notNull(),
  // What was actually sent to Gemini: name/email/phone/links stripped.
  redactedText: text("redacted_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evaluations = pgTable("evaluations", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  rubricVersionId: uuid("rubric_version_id")
    .notNull()
    .references(() => rubricVersions.id),
  extractedFacts: jsonb("extracted_facts").notNull(),
  eligibilityStatus: eligibilityStatusEnum("eligibility_status").notNull(),
  hardRequirementIssues: jsonb("hard_requirement_issues").notNull().default([]),
  historicalFit: jsonb("historical_fit").notNull(),
  historicalFitTotal: integer("historical_fit_total").notNull(),
  jdFit: jsonb("jd_fit").notNull(),
  overallScore: integer("overall_score"), // null when not eligible
  rankingRationale: text("ranking_rationale").notNull(),
  gapsAndUncertainty: jsonb("gaps_and_uncertainty").notNull().default([]),
  interviewProbes: jsonb("interview_probes").notNull().default([]),
  routingDecision: routingDecisionEnum("routing_decision").notNull(),
  // Human-readable, non-judgmental reason: e.g. "Scored 58/100, below the
  // current screening threshold of 65" or "Ineligible: <hard requirement
  // issue>" — never "this is a bad candidate."
  routingReason: text("routing_reason").notNull(),
  screeningThresholdUsed: integer("screening_threshold_used").notNull(),
  manuallyPromoted: boolean("manually_promoted").notNull().default(false),
  promotedAt: timestamp("promoted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const interviewBriefs = pgTable("interview_briefs", {
  id: uuid("id").defaultRandom().primaryKey(),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  briefText: text("brief_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const emailDrafts = pgTable("email_drafts", {
  id: uuid("id").defaultRandom().primaryKey(),
  candidateId: uuid("candidate_id")
    .notNull()
    .references(() => candidates.id, { onDelete: "cascade" }),
  evaluationId: uuid("evaluation_id")
    .notNull()
    .references(() => evaluations.id, { onDelete: "cascade" }),
  emailType: emailTypeEnum("email_type").notNull(),
  subject: text("subject").notNull(),
  // Body as generated by the LLM, containing the literal "{{CANDIDATE_NAME}}"
  // placeholder. Rendered (placeholder -> real name from candidateIdentities)
  // at display time and again at send time.
  bodyTemplate: text("body_template").notNull(),
  status: emailStatusEnum("status").notNull().default("draft"),
  resendMessageId: text("resend_message_id"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Simple key-value config store. Holds the screening threshold (per role) so
// it's adjustable from the Settings UI without a redeploy.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
