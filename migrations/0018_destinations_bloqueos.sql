-- Planes tipo "bloqueo": salida fija, cupos limitados, precio fijo (base_price), is_bloqueo en pestaña catálogo.
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS is_bloqueo boolean NOT NULL DEFAULT false;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS bloqueo_salida_fecha text;
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS bloqueo_cupos_disponibles integer;

-- Antes la pestaña usaba is_promotion: los mismos planes pasan a bloqueos.
UPDATE destinations SET is_bloqueo = true WHERE is_promotion = true AND is_bloqueo = false;
