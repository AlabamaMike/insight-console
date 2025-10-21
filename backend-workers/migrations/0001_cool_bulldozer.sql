CREATE TABLE IF NOT EXISTS "magic_link_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"used_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "full_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "firm_id" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_link_tokens_email_idx" ON "magic_link_tokens" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "magic_link_tokens_token_hash_idx" ON "magic_link_tokens" ("token_hash");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "hashed_password";