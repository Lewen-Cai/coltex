CREATE TABLE "ai_skills" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"project_id" text,
	"created_by" text,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"body" text NOT NULL,
	"files" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_skills_one_owner" CHECK (("ai_skills"."user_id" is null) <> ("ai_skills"."project_id" is null))
);
--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_skills" ADD CONSTRAINT "ai_skills_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_skills_user_name_idx" ON "ai_skills" USING btree ("user_id","name") WHERE "ai_skills"."project_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ai_skills_project_name_idx" ON "ai_skills" USING btree ("project_id","name") WHERE "ai_skills"."project_id" is not null;