-- Configuración de impuestos y fees por cotización (modal en página de cotización)
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "taxes_and_fees" json;
