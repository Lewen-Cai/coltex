CREATE TABLE "history_labels" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"version_id" text NOT NULL,
	"name" text NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "history_labels" ADD CONSTRAINT "history_labels_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_labels" ADD CONSTRAINT "history_labels_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "history_labels_project_idx" ON "history_labels" USING btree ("project_id");