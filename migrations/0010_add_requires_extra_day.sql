-- Add requires_extra_day to destinations (día adicional para viajes transatlánticos)
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "requires_extra_day" boolean DEFAULT false;
