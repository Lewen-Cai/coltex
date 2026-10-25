CREATE TABLE "template_groups" (
	"template_id" text NOT NULL,
	"group_id" text NOT NULL,
	CONSTRAINT "template_groups_template_id_group_id_pk" PRIMARY KEY("template_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "template_users" (
	"template_id" text NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "template_users_template_id_user_id_pk" PRIMARY KEY("template_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "project_templates" ADD COLUMN "field" text DEFAULT 'general' NOT NULL;--> statement-breakpoint
ALTER TABLE "project_templates" ADD COLUMN "everyone" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "template_groups" ADD CONSTRAINT "template_groups_template_id_project_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_groups" ADD CONSTRAINT "template_groups_group_id_user_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."user_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_users" ADD CONSTRAINT "template_users_template_id_project_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."project_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "template_users" ADD CONSTRAINT "template_users_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;