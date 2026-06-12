-- Impuestos fijos configurables por plan (administración de planes)
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "plan_taxes" json;
