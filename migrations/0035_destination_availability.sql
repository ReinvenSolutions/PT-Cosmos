-- Cupos por fecha de salida de cada plan. Solo esquema.

CREATE TABLE IF NOT EXISTS destination_availability (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id varchar NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  date text NOT NULL,
  slots integer NOT NULL,
  price decimal(10, 2)
);

CREATE UNIQUE INDEX IF NOT EXISTS destination_availability_dest_date_unique
  ON destination_availability (destination_id, date);

ALTER TABLE destination_availability ENABLE ROW LEVEL SECURITY;
