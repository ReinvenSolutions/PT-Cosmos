-- Permisos de módulos por usuario (super_admin ignora este campo y ve todo)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "enabled_modules" json
  DEFAULT '{"quote":true,"quoteExpress":true,"dayCounter":true,"milesCalculator":true,"academy":true}'::json
  NOT NULL;

-- Los proveedores no tenían Academia; el super admin la enciende si corresponde.
UPDATE "users"
SET "enabled_modules" = '{"quote":true,"quoteExpress":true,"dayCounter":true,"milesCalculator":true,"academy":false}'::json
WHERE role = 'provider';
