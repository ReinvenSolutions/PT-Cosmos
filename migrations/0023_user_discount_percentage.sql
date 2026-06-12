-- Porcentaje de descuento asignado por super_admin a asesores y agencias (solo porción terrestre en cotizaciones)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "discount_percentage" numeric(5, 2) DEFAULT 0 NOT NULL;
