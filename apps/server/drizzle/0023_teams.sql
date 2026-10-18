-- Inviters become admins who lead a team; there is one system administrator.
UPDATE "user" SET "role" = 'manager' WHERE "role" = 'inviter';--> statement-breakpoint
UPDATE "invites" SET "role" = 'manager' WHERE "role" IN ('inviter', 'admin');--> statement-breakpoint
-- The first administrator stays the system administrator; any others lead teams.
UPDATE "user" SET "role" = 'manager' WHERE "role" = 'admin' AND "id" <> (SELECT "id" FROM "user" WHERE "role" = 'admin' ORDER BY "created_at", "id" LIMIT 1);--> statement-breakpoint
CREATE TABLE "team_members" (
	"user_id" text PRIMARY KEY NOT NULL,
	"manager_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_manager_id_user_id_fk" FOREIGN KEY ("manager_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "team_members_manager_idx" ON "team_members" USING btree ("manager_id");--> statement-breakpoint
-- Members someone (now an admin) invited are in that admin's team.
INSERT INTO "team_members" ("user_id", "manager_id")
SELECT DISTINCT ON (i."used_by") i."used_by", i."created_by" FROM "invites" i
JOIN "user" m ON m."id" = i."created_by" AND m."role" = 'manager'
JOIN "user" u ON u."id" = i."used_by" AND u."role" = 'user'
ORDER BY i."used_by", i."used_at";--> statement-breakpoint
CREATE UNIQUE INDEX "user_one_system_admin_idx" ON "user" USING btree ((true)) WHERE "user"."role" = 'admin';
