CREATE TABLE "git_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "git_tokens" ADD CONSTRAINT "git_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "git_tokens_hash_idx" ON "git_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "git_tokens_user_idx" ON "git_tokens" USING btree ("user_id");