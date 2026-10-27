CREATE TYPE "public"."assessment_kind" AS ENUM('pre', 'post', 'formative');--> statement-breakpoint
CREATE TYPE "public"."attempt_status" AS ENUM('in_progress', 'submitted');--> statement-breakpoint
CREATE TYPE "public"."attendance_value" AS ENUM('pending', 'attended', 'late', 'absent', 'excused');--> statement-breakpoint
CREATE TYPE "public"."certificate_status" AS ENUM('issued', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."competency" AS ENUM('discover_needs', 'verify_information', 'communicate_clearly', 'recover_service', 'protect_information');--> statement-breakpoint
CREATE TYPE "public"."course_format" AS ENUM('video', 'interactive', 'resource', 'session', 'preview');--> statement-breakpoint
CREATE TYPE "public"."enrolment_status" AS ENUM('not_started', 'in_progress', 'awaiting_review', 'completed');--> statement-breakpoint
CREATE TYPE "public"."experience_band" AS ENUM('lt_1', '1_3', '4_7', '8_plus');--> statement-breakpoint
CREATE TYPE "public"."job_function" AS ENUM('guest_services', 'front_office', 'guiding', 'transport', 'sales', 'operations', 'training', 'management', 'other');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email');--> statement-breakpoint
CREATE TYPE "public"."notification_state" AS ENUM('simulated', 'queued', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."organisation_type" AS ENUM('hotel_accommodation', 'tour_operator', 'transport', 'travel_trade', 'attraction_venue', 'public_sector', 'education', 'independent', 'other');--> statement-breakpoint
CREATE TYPE "public"."package_type" AS ENUM('video', 'scorm_2004', 'scorm_12', 'html_preview', 'resource');--> statement-breakpoint
CREATE TYPE "public"."path_item_kind" AS ENUM('course', 'assessment_pre', 'assessment_post', 'assessment_formative', 'ai_practice', 'session', 'assignment');--> statement-breakpoint
CREATE TYPE "public"."path_version_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."profile_status" AS ENUM('draft', 'complete');--> statement-breakpoint
CREATE TYPE "public"."programme_code" AS ENUM('A', 'B', 'C');--> statement-breakpoint
CREATE TYPE "public"."programme_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('returned', 'approved');--> statement-breakpoint
CREATE TYPE "public"."roleplay_mode" AS ENUM('text', 'voice');--> statement-breakpoint
CREATE TYPE "public"."rsvp_status" AS ENUM('confirmed', 'waitlisted', 'cancelled', 'moved');--> statement-breakpoint
CREATE TYPE "public"."rule_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."score_status" AS ENUM('draft', 'final');--> statement-breakpoint
CREATE TYPE "public"."seniority" AS ENUM('student_trainee', 'entry_level', 'experienced_professional', 'supervisor', 'manager', 'senior_leader', 'independent_professional');--> statement-breakpoint
CREATE TYPE "public"."session_format" AS ENUM('in_person', 'online');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'published', 'full', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('submitted', 'under_review', 'returned', 'approved');--> statement-breakpoint
CREATE TYPE "public"."unit_progress_status" AS ENUM('not_started', 'in_progress', 'completed');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"attempt_id" uuid NOT NULL,
	"competency" "competency" NOT NULL,
	"selected_option" text NOT NULL,
	"points" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"attempt_no" smallint DEFAULT 1 NOT NULL,
	"status" "attempt_status" DEFAULT 'in_progress' NOT NULL,
	"score" smallint,
	"competency_scores" jsonb,
	"started_at" timestamp with time zone NOT NULL,
	"submitted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"kind" "assessment_kind" NOT NULL,
	"version" text NOT NULL,
	"title" text NOT NULL,
	"pass_percent" smallint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assessments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "assignment_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"path_id" uuid NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"conditions" jsonb NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"status" "rule_status" DEFAULT 'published' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignment_rules_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"title" text NOT NULL,
	"brief" text NOT NULL,
	"word_min" integer,
	"word_max" integer,
	"allows_upload" boolean DEFAULT false NOT NULL,
	"pass_percent" smallint DEFAULT 70 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assignments_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rsvp_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"status" "attendance_value" DEFAULT 'pending' NOT NULL,
	"marked_by" text,
	"marked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendance_rsvp_id_unique" UNIQUE("rsvp_id")
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_role" text NOT NULL,
	"actor_label" text,
	"action" text NOT NULL,
	"object_type" text NOT NULL,
	"object_id" text,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"outcome" text DEFAULT 'allowed' NOT NULL,
	"request_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"learner_name" text NOT NULL,
	"status" "certificate_status" DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"issued_by" text,
	"revoked_at" timestamp with time zone,
	"revoked_by" text,
	"revoke_reason" text,
	"reissued_from_id" uuid,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "content_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" uuid NOT NULL,
	"type" "package_type" NOT NULL,
	"version" text DEFAULT '1.0' NOT NULL,
	"title" text NOT NULL,
	"launch_url" text,
	"format_label" text NOT NULL,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"format" "course_format" NOT NULL,
	"duration_minutes" integer NOT NULL,
	"summary" text NOT NULL,
	"completion_rule" jsonb NOT NULL,
	"completion_text" text NOT NULL,
	"transcript" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "demo_meta" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"reference_date" date NOT NULL,
	"seed_version" text NOT NULL,
	"anchored_at" timestamp with time zone NOT NULL,
	"seeded_at" timestamp with time zone NOT NULL,
	"counts" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enrolments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"learner_id" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"status" "enrolment_status" DEFAULT 'not_started' NOT NULL,
	"path_id" uuid,
	"path_version_id" uuid,
	"assignment_reason" text,
	"override_reason" text,
	"overridden_by" text,
	"current_stage" text,
	"progress_percent" smallint DEFAULT 0 NOT NULL,
	"enrolled_at" timestamp with time zone NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "learning_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"current_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learning_paths_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"kind" text NOT NULL,
	"recipient_id" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"state" "notification_state" DEFAULT 'simulated' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"session_id" uuid,
	"actor_id" text,
	"failure_reason" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" "organisation_type" NOT NULL,
	"city" text,
	"is_pseudo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisations_code_unique" UNIQUE("code"),
	CONSTRAINT "organisations_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "path_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_version_id" uuid NOT NULL,
	"position" smallint NOT NULL,
	"kind" "path_item_kind" NOT NULL,
	"course_id" uuid,
	"scenario_key" text,
	"title" text NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"level" smallint DEFAULT 1 NOT NULL,
	"stage" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "path_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"path_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "path_version_status" DEFAULT 'draft' NOT NULL,
	"change_note" text,
	"published_at" timestamp with time zone,
	"published_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"learner_code" text NOT NULL,
	"full_name" text NOT NULL,
	"organisation_id" uuid,
	"organisation_other" text,
	"job_title" text,
	"job_function" "job_function",
	"seniority" "seniority",
	"experience" "experience_band",
	"country" text,
	"city" text,
	"preferred_language" text,
	"captions_preference" boolean,
	"accessibility_request" text,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"weekly_minutes" smallint,
	"mobile" text,
	"wizard_step" smallint DEFAULT 1 NOT NULL,
	"status" "profile_status" DEFAULT 'draft' NOT NULL,
	"consent_accepted_at" timestamp with time zone,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"suspended" boolean DEFAULT false NOT NULL,
	"registered_at" timestamp with time zone NOT NULL,
	"last_activity_at" timestamp with time zone,
	"completeness" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "profiles_learner_code_unique" UNIQUE("learner_code")
);
--> statement-breakpoint
CREATE TABLE "programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "programme_code" NOT NULL,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"summary" text NOT NULL,
	"format_label" text NOT NULL,
	"duration_label" text NOT NULL,
	"levels" smallint DEFAULT 1 NOT NULL,
	"certification_enabled" boolean DEFAULT false NOT NULL,
	"is_illustrative" boolean DEFAULT false NOT NULL,
	"status" "programme_status" DEFAULT 'draft' NOT NULL,
	"card_image_path" text,
	"completion_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "programmes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"submission_id" uuid NOT NULL,
	"reviewer_id" text,
	"rubric_score" smallint NOT NULL,
	"rubric_breakdown" jsonb,
	"feedback" text NOT NULL,
	"status" "review_status" NOT NULL,
	"reviewed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_submission_id_unique" UNIQUE("submission_id")
);
--> statement-breakpoint
CREATE TABLE "roleplay_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"scenario_key" text NOT NULL,
	"mode" "roleplay_mode" NOT NULL,
	"transcript" jsonb NOT NULL,
	"empathy_score" smallint NOT NULL,
	"discovery_score" smallint NOT NULL,
	"clarity_score" smallint NOT NULL,
	"accuracy_score" smallint NOT NULL,
	"solution_score" smallint NOT NULL,
	"total_score" smallint NOT NULL,
	"total_percent" smallint NOT NULL,
	"feedback" jsonb NOT NULL,
	"used_recorded_demo" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"status" "rsvp_status" NOT NULL,
	"waitlist_position" smallint,
	"replaced_by_rsvp_id" uuid,
	"cancelled_reason" text,
	"booked_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "session_reschedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"previous_starts_at" timestamp with time zone NOT NULL,
	"previous_ends_at" timestamp with time zone NOT NULL,
	"new_starts_at" timestamp with time zone NOT NULL,
	"new_ends_at" timestamp with time zone NOT NULL,
	"previous_venue" text,
	"new_venue" text,
	"reason" text NOT NULL,
	"affected_rsvps" integer DEFAULT 0 NOT NULL,
	"event_id" text NOT NULL,
	"changed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_reschedules_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE "session_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rsvp_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"preparation" smallint NOT NULL,
	"communication" smallint NOT NULL,
	"practical" smallint NOT NULL,
	"professionalism" smallint NOT NULL,
	"total" smallint NOT NULL,
	"status" "score_status" DEFAULT 'draft' NOT NULL,
	"feedback" text,
	"correction_reason" text,
	"scored_by" text,
	"finalised_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_scores_rsvp_id_unique" UNIQUE("rsvp_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"programme_id" uuid NOT NULL,
	"level" text,
	"stage" text,
	"trainer_id" uuid NOT NULL,
	"format" "session_format" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"timezone" text DEFAULT 'Asia/Qatar' NOT NULL,
	"capacity" integer NOT NULL,
	"venue" text,
	"room" text,
	"access_note" text,
	"meeting_ref" text,
	"join_instructions" text,
	"booking_deadline" timestamp with time zone,
	"cancellation_policy" text NOT NULL,
	"description" text NOT NULL,
	"materials" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prerequisite" text,
	"is_completion_gate" boolean DEFAULT false NOT NULL,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"cancelled_reason" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "submissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assignment_id" uuid NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"learner_id" text NOT NULL,
	"version" smallint DEFAULT 1 NOT NULL,
	"status" "submission_status" DEFAULT 'submitted' NOT NULL,
	"response_text" text,
	"word_count" integer,
	"file_name" text,
	"mime_type" text,
	"size_bytes" integer,
	"storage_path" text,
	"marker_trainer_id" uuid,
	"submitted_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trainer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"code" text NOT NULL,
	"full_name" text NOT NULL,
	"headline" text NOT NULL,
	"bio" text NOT NULL,
	"expertise" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"languages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"organisation" text NOT NULL,
	"avatar_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_profiles_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "trainer_profiles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "trainer_programmes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trainer_id" uuid NOT NULL,
	"programme_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unit_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrolment_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"status" "unit_progress_status" DEFAULT 'not_started' NOT NULL,
	"percent" smallint DEFAULT 0 NOT NULL,
	"cmi_completion_status" text,
	"cmi_success_status" text,
	"score_raw" real,
	"session_time_seconds" integer DEFAULT 0 NOT NULL,
	"suspend_data" text,
	"location" text,
	"completed_at" timestamp with time zone,
	"source" text DEFAULT 'learner' NOT NULL,
	"extra" jsonb,
	"last_activity_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'learner' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_answers" ADD CONSTRAINT "assessment_answers_attempt_id_assessment_attempts_id_fk" FOREIGN KEY ("attempt_id") REFERENCES "public"."assessment_attempts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_attempts" ADD CONSTRAINT "assessment_attempts_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_rules" ADD CONSTRAINT "assignment_rules_path_id_learning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_marked_by_user_id_fk" FOREIGN KEY ("marked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issued_by_user_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_revoked_by_user_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_packages" ADD CONSTRAINT "content_packages_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_path_id_learning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."learning_paths"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_path_version_id_path_versions_id_fk" FOREIGN KEY ("path_version_id") REFERENCES "public"."path_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrolments" ADD CONSTRAINT "enrolments_overridden_by_user_id_fk" FOREIGN KEY ("overridden_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_user_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_items" ADD CONSTRAINT "path_items_path_version_id_path_versions_id_fk" FOREIGN KEY ("path_version_id") REFERENCES "public"."path_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_items" ADD CONSTRAINT "path_items_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_versions" ADD CONSTRAINT "path_versions_path_id_learning_paths_id_fk" FOREIGN KEY ("path_id") REFERENCES "public"."learning_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "path_versions" ADD CONSTRAINT "path_versions_published_by_user_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_submission_id_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."submissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_id_user_id_fk" FOREIGN KEY ("reviewer_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roleplay_attempts" ADD CONSTRAINT "roleplay_attempts_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roleplay_attempts" ADD CONSTRAINT "roleplay_attempts_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reschedules" ADD CONSTRAINT "session_reschedules_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_reschedules" ADD CONSTRAINT "session_reschedules_changed_by_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_rsvp_id_rsvps_id_fk" FOREIGN KEY ("rsvp_id") REFERENCES "public"."rsvps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_scored_by_user_id_fk" FOREIGN KEY ("scored_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_trainer_id_trainer_profiles_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainer_profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_assignments_id_fk" FOREIGN KEY ("assignment_id") REFERENCES "public"."assignments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_learner_id_user_id_fk" FOREIGN KEY ("learner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_marker_trainer_id_trainer_profiles_id_fk" FOREIGN KEY ("marker_trainer_id") REFERENCES "public"."trainer_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_profiles" ADD CONSTRAINT "trainer_profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_programmes" ADD CONSTRAINT "trainer_programmes_trainer_id_trainer_profiles_id_fk" FOREIGN KEY ("trainer_id") REFERENCES "public"."trainer_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trainer_programmes" ADD CONSTRAINT "trainer_programmes_programme_id_programmes_id_fk" FOREIGN KEY ("programme_id") REFERENCES "public"."programmes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_progress" ADD CONSTRAINT "unit_progress_enrolment_id_enrolments_id_fk" FOREIGN KEY ("enrolment_id") REFERENCES "public"."enrolments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "unit_progress" ADD CONSTRAINT "unit_progress_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_answers_attempt_competency_uq" ON "assessment_answers" USING btree ("attempt_id","competency");--> statement-breakpoint
CREATE UNIQUE INDEX "assessment_attempts_uq" ON "assessment_attempts" USING btree ("assessment_id","enrolment_id","attempt_no");--> statement-breakpoint
CREATE INDEX "assessment_attempts_learner_idx" ON "assessment_attempts" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "assessment_attempts_submitted_idx" ON "assessment_attempts" USING btree ("submitted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "assessments_kind_version_uq" ON "assessments" USING btree ("kind","version");--> statement-breakpoint
CREATE INDEX "assignment_rules_programme_priority_idx" ON "assignment_rules" USING btree ("programme_id","priority");--> statement-breakpoint
CREATE INDEX "attendance_session_idx" ON "attendance" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "attendance_learner_idx" ON "attendance" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "audit_events_created_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_events_object_idx" ON "audit_events" USING btree ("object_type","object_id");--> statement-breakpoint
CREATE INDEX "audit_events_actor_idx" ON "audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_events_action_idx" ON "audit_events" USING btree ("action");--> statement-breakpoint
CREATE UNIQUE INDEX "certificates_active_enrolment_uq" ON "certificates" USING btree ("enrolment_id") WHERE "certificates"."status" = 'issued';--> statement-breakpoint
CREATE INDEX "certificates_learner_idx" ON "certificates" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "content_packages_course_idx" ON "content_packages" USING btree ("course_id");--> statement-breakpoint
CREATE UNIQUE INDEX "content_packages_course_version_uq" ON "content_packages" USING btree ("course_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "enrolments_learner_programme_uq" ON "enrolments" USING btree ("learner_id","programme_id");--> statement-breakpoint
CREATE INDEX "enrolments_programme_status_idx" ON "enrolments" USING btree ("programme_id","status");--> statement-breakpoint
CREATE INDEX "enrolments_last_activity_idx" ON "enrolments" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "learning_paths_programme_idx" ON "learning_paths" USING btree ("programme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_uq" ON "notifications" USING btree ("event_id","recipient_id","channel");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_event_idx" ON "notifications" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "organisations_type_idx" ON "organisations" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "path_items_version_position_uq" ON "path_items" USING btree ("path_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "path_versions_path_version_uq" ON "path_versions" USING btree ("path_id","version");--> statement-breakpoint
CREATE INDEX "profiles_organisation_idx" ON "profiles" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "profiles_seniority_idx" ON "profiles" USING btree ("seniority");--> statement-breakpoint
CREATE INDEX "profiles_registered_at_idx" ON "profiles" USING btree ("registered_at");--> statement-breakpoint
CREATE INDEX "profiles_last_activity_idx" ON "profiles" USING btree ("last_activity_at");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("reviewer_id");--> statement-breakpoint
CREATE INDEX "roleplay_attempts_enrolment_idx" ON "roleplay_attempts" USING btree ("enrolment_id");--> statement-breakpoint
CREATE INDEX "roleplay_attempts_learner_idx" ON "roleplay_attempts" USING btree ("learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rsvps_active_learner_session_uq" ON "rsvps" USING btree ("session_id","learner_id") WHERE "rsvps"."status" in ('confirmed', 'waitlisted');--> statement-breakpoint
CREATE INDEX "rsvps_learner_idx" ON "rsvps" USING btree ("learner_id");--> statement-breakpoint
CREATE INDEX "rsvps_session_status_idx" ON "rsvps" USING btree ("session_id","status");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_reschedules_session_idx" ON "session_reschedules" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "session_scores_session_idx" ON "session_scores" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "sessions_trainer_starts_idx" ON "sessions" USING btree ("trainer_id","starts_at");--> statement-breakpoint
CREATE INDEX "sessions_programme_status_idx" ON "sessions" USING btree ("programme_id","status");--> statement-breakpoint
CREATE INDEX "sessions_starts_idx" ON "sessions" USING btree ("starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX "submissions_version_uq" ON "submissions" USING btree ("assignment_id","enrolment_id","version");--> statement-breakpoint
CREATE INDEX "submissions_status_idx" ON "submissions" USING btree ("status","submitted_at");--> statement-breakpoint
CREATE INDEX "submissions_marker_idx" ON "submissions" USING btree ("marker_trainer_id");--> statement-breakpoint
CREATE INDEX "submissions_learner_idx" ON "submissions" USING btree ("learner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trainer_programmes_uq" ON "trainer_programmes" USING btree ("trainer_id","programme_id");--> statement-breakpoint
CREATE INDEX "trainer_programmes_programme_idx" ON "trainer_programmes" USING btree ("programme_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unit_progress_enrolment_course_uq" ON "unit_progress" USING btree ("enrolment_id","course_id");--> statement-breakpoint
CREATE INDEX "unit_progress_course_idx" ON "unit_progress" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");