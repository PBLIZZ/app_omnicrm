ALTER TABLE "ai_insights" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "embeddings" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "interactions" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "raw_events" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "ai_insights_user_id_idx" ON "ai_insights" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "contacts_user_id_idx" ON "contacts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "documents_user_id_idx" ON "documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "embeddings_user_id_idx" ON "embeddings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "interactions_user_id_idx" ON "interactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jobs_user_id_idx" ON "jobs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "raw_events_user_id_idx" ON "raw_events" USING btree ("user_id");