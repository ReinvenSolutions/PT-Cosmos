-- Vuelos de conexión entre planes combinados (multi-segmento + compatibilidad)
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "connection_flight_images" text[];
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "connection_cabin_baggage" boolean DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "connection_hold_baggage" boolean DEFAULT false;
ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "connection_flight_segments" jsonb;
