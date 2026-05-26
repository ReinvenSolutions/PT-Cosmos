-- Texto de recomendaciones del plan (última sección del PDF)
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS recommendations text;
