-- Add domestic flight fields to quotes table
ALTER TABLE "quotes" ADD COLUMN "domestic_flight_images" text[];
ALTER TABLE "quotes" ADD COLUMN "domestic_cabin_baggage" boolean DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN "domestic_hold_baggage" boolean DEFAULT false;
