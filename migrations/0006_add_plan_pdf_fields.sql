-- Add plan-level PDF and flight management fields to destinations
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "internal_flights" json;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "medical_assistance_info" text;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "medical_assistance_image_url" text;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "first_page_comments" text;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "itinerary_map_image_url" text;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "flight_terms" text;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "terms_conditions" text;

-- Table for global and per-plan terms and conditions
CREATE TABLE IF NOT EXISTS "terms_conditions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "content" text NOT NULL,
  "scope" text NOT NULL DEFAULT 'plan' CHECK (scope IN ('global', 'plan')),
  "destination_id" varchar REFERENCES "destinations"("id") ON DELETE CASCADE,
  "display_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now()
);

-- Global terms have destination_id = null
CREATE INDEX IF NOT EXISTS "idx_terms_scope" ON "terms_conditions"("scope");
CREATE INDEX IF NOT EXISTS "idx_terms_destination" ON "terms_conditions"("destination_id");
