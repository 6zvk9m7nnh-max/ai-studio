CREATE TABLE "ai_quotas" (
	"id" text PRIMARY KEY,
	"state" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" text PRIMARY KEY,
	"workspace_id" text NOT NULL,
	"project_id" text NOT NULL,
	"prompt" text NOT NULL,
	"roles" jsonb NOT NULL,
	"results" jsonb DEFAULT '[]' NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"error" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
