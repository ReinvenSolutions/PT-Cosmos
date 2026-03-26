/* Galería hoteles por plan: URLs en BD, archivos en bucket plan-{slug}-hotels */
ALTER TABLE "destinations"
ADD COLUMN IF NOT EXISTS "hotel_gallery_image_urls" text[];
