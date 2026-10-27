ALTER TYPE "public"."review_status" ADD VALUE 'draft' BEFORE 'returned';--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "draft_decision" "review_status";