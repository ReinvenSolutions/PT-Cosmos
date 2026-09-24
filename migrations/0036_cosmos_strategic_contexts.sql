-- Contextos estratégicos nombrados para Cosmos. Solo esquema.

CREATE TABLE IF NOT EXISTS cosmos_strategic_contexts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL,
  content text NOT NULL DEFAULT '',
  destination_id varchar REFERENCES destinations(id) ON DELETE SET NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cosmos_strategic_contexts_kind_check CHECK (kind IN ('destination', 'activity'))
);

CREATE INDEX IF NOT EXISTS cosmos_strategic_contexts_updated_idx
  ON cosmos_strategic_contexts (updated_at DESC);
CREATE INDEX IF NOT EXISTS cosmos_strategic_contexts_destination_idx
  ON cosmos_strategic_contexts (destination_id);

ALTER TABLE cosmos_strategic_contexts ENABLE ROW LEVEL SECURITY;
