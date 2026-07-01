-- Configuración del cotizador de millas por usuario (asignada por super_admin)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_type" text DEFAULT 'none' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_value" numeric(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_programs_allowed" text DEFAULT 'both' NOT NULL;
