-- Notas internas por plan para el asistente Cosmos (no se publican en catálogo ni PDF)
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cosmos_assistant_notes text;
