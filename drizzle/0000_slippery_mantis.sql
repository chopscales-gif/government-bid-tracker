CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"opportunity_id" text NOT NULL,
	"day" integer NOT NULL,
	"text" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" text PRIMARY KEY NOT NULL,
	"sandbox_id" text NOT NULL,
	"key" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"checked" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seen_addenda" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sandboxes" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"day" integer DEFAULT 0 NOT NULL,
	"profile" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_opportunity_id_opportunities_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."opportunities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunities" ADD CONSTRAINT "opportunities_sandbox_id_sandboxes_id_fk" FOREIGN KEY ("sandbox_id") REFERENCES "public"."sandboxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_sandbox" ON "events" USING btree ("sandbox_id");--> statement-breakpoint
CREATE INDEX "events_opportunity" ON "events" USING btree ("opportunity_id");--> statement-breakpoint
CREATE INDEX "opportunities_sandbox" ON "opportunities" USING btree ("sandbox_id");