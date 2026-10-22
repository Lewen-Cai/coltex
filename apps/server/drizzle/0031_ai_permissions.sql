CREATE TABLE "ai_permissions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"permission" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ai_permissions" ADD CONSTRAINT "ai_permissions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_members" DROP COLUMN "mcp_mode";