CREATE TABLE "compile_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"ms" integer NOT NULL,
	"status" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitor_samples" (
	"at" timestamp with time zone PRIMARY KEY NOT NULL,
	"boot" timestamp with time zone NOT NULL,
	"server_cpu" real NOT NULL,
	"server_mem" bigint NOT NULL,
	"server_mem_limit" bigint NOT NULL,
	"compiler_cpu" real,
	"compiler_mem" bigint,
	"compiler_mem_limit" bigint
);
--> statement-breakpoint
CREATE INDEX "compile_runs_at_idx" ON "compile_runs" USING btree ("at");