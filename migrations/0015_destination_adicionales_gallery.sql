/* Galería Adicionales por plan: URLs en BD, archivos en bucket plan-{slug}-adicionales (PDF misma hoja que hoteles) */
ALTER TABLE "destinations"
ADD COLUMN IF NOT EXISTS "adicionales_gallery_image_urls" text[];
