CREATE TABLE "ai_user_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"policy" jsonb,
	"limits" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_user_settings" ADD CONSTRAINT "ai_user_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;