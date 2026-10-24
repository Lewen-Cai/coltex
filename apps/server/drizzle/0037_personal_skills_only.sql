-- Skills are each person's now (2026-10-24): project skills go, with no copy.
DELETE FROM "ai_skills" WHERE "project_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_skills" DROP CONSTRAINT "ai_skills_one_owner";--> statement-breakpoint
ALTER TABLE "ai_skills" DROP CONSTRAINT "ai_skills_project_id_projects_id_fk";
--> statement-breakpoint
ALTER TABLE "ai_skills" DROP CONSTRAINT "ai_skills_created_by_user_id_fk";
--> statement-breakpoint
DROP INDEX "ai_skills_project_name_idx";--> statement-breakpoint
DROP INDEX "ai_skills_user_name_idx";--> statement-breakpoint
ALTER TABLE "ai_skills" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_skills_user_name_idx" ON "ai_skills" USING btree ("user_id","name");--> statement-breakpoint
ALTER TABLE "ai_skills" DROP COLUMN "project_id";--> statement-breakpoint
ALTER TABLE "ai_skills" DROP COLUMN "created_by";