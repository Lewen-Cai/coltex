CREATE TABLE "learned_words" (
	"user_id" text NOT NULL,
	"word" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "learned_words_user_id_word_pk" PRIMARY KEY("user_id","word")
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "spell_check_language" text DEFAULT 'en_US' NOT NULL;--> statement-breakpoint
ALTER TABLE "learned_words" ADD CONSTRAINT "learned_words_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;