ALTER TABLE "git_tokens" ADD COLUMN "uses" jsonb DEFAULT '["git","mcp"]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "git_tokens" ADD COLUMN "read_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "git_tokens" ADD COLUMN "project_ids" jsonb;--> statement-breakpoint
ALTER TABLE "git_tokens" ADD COLUMN "expires_at" timestamp with time zone;