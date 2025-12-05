-- Add price tiers and allowed days fields to destinations table
ALTER TABLE "destinations" ADD COLUMN "allowed_days" text[];
ALTER TABLE "destinations" ADD COLUMN "price_tiers" json;
