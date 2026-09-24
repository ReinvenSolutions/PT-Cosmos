-- Día del itinerario tras el cual el PDF inserta el vuelo interno de un plan.
ALTER TABLE "destinations"
  ADD COLUMN IF NOT EXISTS "internal_flight_after_day" integer;

-- Imágenes de vuelo interno por destino (combinados). El array legacy domestic_flight_images se conserva.
ALTER TABLE "quotes"
  ADD COLUMN IF NOT EXISTS "domestic_flight_images_by_destination" json;
