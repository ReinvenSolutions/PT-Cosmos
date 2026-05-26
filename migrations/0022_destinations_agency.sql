-- Planes creados por usuarios con rol agencia (solo esquema; sin insertar destinos)
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "created_by_user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "agency_display_name" text;

CREATE INDEX IF NOT EXISTS "destinations_created_by_user_id_idx" ON "destinations" ("created_by_user_id");
