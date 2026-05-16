-- Audio descriptivo del programa (URL pública, p. ej. Supabase Storage, MP3)
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS descriptive_audio_url text;
