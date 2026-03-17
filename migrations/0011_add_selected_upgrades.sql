-- Add selected_upgrades JSON to quotes for generic upgrade selection per destination
-- Format: { "destinationId": "upgradeCode" }
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS selected_upgrades jsonb DEFAULT NULL;
