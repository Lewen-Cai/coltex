CREATE TABLE "ai_groups" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"policy" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_user_groups" (
	"user_id" text PRIMARY KEY NOT NULL,
	"group_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invites" ADD COLUMN "ai_group_id" text;--> statement-breakpoint
ALTER TABLE "ai_user_groups" ADD CONSTRAINT "ai_user_groups_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_user_groups" ADD CONSTRAINT "ai_user_groups_group_id_ai_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."ai_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_user_groups_group_idx" ON "ai_user_groups" USING btree ("group_id");--> statement-breakpoint
ALTER TABLE "invites" ADD CONSTRAINT "invites_ai_group_id_ai_groups_id_fk" FOREIGN KEY ("ai_group_id") REFERENCES "public"."ai_groups"("id") ON DELETE set null ON UPDATE no action;