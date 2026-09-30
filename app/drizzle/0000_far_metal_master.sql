CREATE TYPE "public"."candidate_decision" AS ENUM('pending', 'interview', 'reject');--> statement-breakpoint
CREATE TYPE "public"."candidate_status" AS ENUM('uploaded', 'redacting', 'scoring', 'scored', 'briefing', 'drafting_email', 'ready', 'error');--> statement-breakpoint
CREATE TYPE "public"."eligibility_status" AS ENUM('Eligible', 'Not eligible');--> statement-breakpoint
CREATE TYPE "public"."email_status" AS ENUM('draft', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."email_type" AS ENUM('invite', 'rejection');--> statement-breakpoint
CREATE TYPE "public"."routing_decision" AS ENUM('review_queue', 'screening_queue');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidate_identities" (
	"candidate_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text,
	"phone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role_id" text NOT NULL,
	"status" "candidate_status" DEFAULT 'uploaded' NOT NULL,
	"decision" "candidate_decision" DEFAULT 'pending' NOT NULL,
	"processing_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"raw_text" text NOT NULL,
	"redacted_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"email_type" "email_type" NOT NULL,
	"subject" text NOT NULL,
	"body_template" text NOT NULL,
	"status" "email_status" DEFAULT 'draft' NOT NULL,
	"resend_message_id" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evaluations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"candidate_id" uuid NOT NULL,
	"rubric_version_id" uuid NOT NULL,
	"extracted_facts" jsonb NOT NULL,
	"eligibility_status" "eligibility_status" NOT NULL,
	"hard_requirement_issues" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"historical_fit" jsonb NOT NULL,
	"historical_fit_total" integer NOT NULL,
	"jd_fit" jsonb NOT NULL,
	"overall_score" integer,
	"ranking_rationale" text NOT NULL,
	"gaps_and_uncertainty" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"interview_probes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"routing_decision" "routing_decision" NOT NULL,
	"routing_reason" text NOT NULL,
	"screening_threshold_used" integer NOT NULL,
	"manually_promoted" boolean DEFAULT false NOT NULL,
	"promoted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evaluation_id" uuid NOT NULL,
	"brief_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rubric_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version_label" text NOT NULL,
	"historical_fit_config" jsonb NOT NULL,
	"jd_fit_config" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubric_versions_version_label_unique" UNIQUE("version_label")
);
--> statement-breakpoint
ALTER TABLE "candidate_identities" ADD CONSTRAINT "candidate_identities_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_documents" ADD CONSTRAINT "cv_documents_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_drafts" ADD CONSTRAINT "email_drafts_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "public"."candidates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluations" ADD CONSTRAINT "evaluations_rubric_version_id_rubric_versions_id_fk" FOREIGN KEY ("rubric_version_id") REFERENCES "public"."rubric_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interview_briefs" ADD CONSTRAINT "interview_briefs_evaluation_id_evaluations_id_fk" FOREIGN KEY ("evaluation_id") REFERENCES "public"."evaluations"("id") ON DELETE cascade ON UPDATE no action;