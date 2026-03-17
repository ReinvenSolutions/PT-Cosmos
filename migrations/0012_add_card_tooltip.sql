-- Add card_tooltip to destinations for custom tooltip text on plan cards
ALTER TABLE destinations ADD COLUMN IF NOT EXISTS card_tooltip text DEFAULT NULL;
