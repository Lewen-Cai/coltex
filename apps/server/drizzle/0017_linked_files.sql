CREATE TABLE "linked_files" (
	"project_id" text NOT NULL,
	"path" text NOT NULL,
	"kind" text NOT NULL,
	"url" text,
	"source_project_id" text,
	"source_project_name" text,
	"source_path" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linked_files_project_id_path_pk" PRIMARY KEY("project_id","path")
);
--> statement-breakpoint
ALTER TABLE "linked_files" ADD CONSTRAINT "linked_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_files" ADD CONSTRAINT "linked_files_source_project_id_projects_id_fk" FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_files" ADD CONSTRAINT "linked_files_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;