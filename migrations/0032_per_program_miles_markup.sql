-- Recargo del cotizador de millas por programa (LifeMiles / Smiles)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_type_lifemiles" text DEFAULT 'none' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_value_lifemiles" numeric(12, 2) DEFAULT 0 NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_type_smiles" text DEFAULT 'none' NOT NULL;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "miles_markup_value_smiles" numeric(12, 2) DEFAULT 0 NOT NULL;

-- Migrar recargo global existente al programa correspondiente
UPDATE "users"
SET
  miles_markup_type_lifemiles = CASE
    WHEN miles_programs_allowed IN ('lifemiles', 'both') THEN miles_markup_type
    ELSE 'none'
  END,
  miles_markup_value_lifemiles = CASE
    WHEN miles_programs_allowed IN ('lifemiles', 'both') THEN miles_markup_value
    ELSE 0
  END,
  miles_markup_type_smiles = CASE
    WHEN miles_programs_allowed IN ('smiles', 'both') THEN miles_markup_type
    ELSE 'none'
  END,
  miles_markup_value_smiles = CASE
    WHEN miles_programs_allowed IN ('smiles', 'both') THEN miles_markup_value
    ELSE 0
  END
WHERE miles_markup_type IS DISTINCT FROM 'none'
   OR miles_markup_value IS DISTINCT FROM 0;
