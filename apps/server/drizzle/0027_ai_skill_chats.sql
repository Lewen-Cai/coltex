CREATE TABLE "ai_skill_chats" (
	"user_id" text PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"items" jsonb NOT NULL,
	"messages" jsonb NOT NULL,
	"context_tokens" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_skill_chats" ADD CONSTRAINT "ai_skill_chats_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;