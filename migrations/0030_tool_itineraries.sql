-- Contador de días (herramientas): itinerario de 25 días por usuario
CREATE TABLE IF NOT EXISTS tool_itineraries (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date VARCHAR(10) NOT NULL,
  days JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_user_tool_itinerary UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_tool_itineraries_user_id ON tool_itineraries(user_id);
