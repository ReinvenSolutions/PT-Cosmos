-- Add unique constraint to prevent duplicate itinerary days
-- This ensures that a destination cannot have multiple entries for the same day number

-- First, remove any existing duplicates (keep the first occurrence)
DELETE FROM itinerary_days
WHERE id NOT IN (
  SELECT DISTINCT ON (destination_id, day_number) id
  FROM itinerary_days
  ORDER BY destination_id, day_number, id
);

-- Add unique constraint
ALTER TABLE itinerary_days
ADD CONSTRAINT unique_destination_day UNIQUE (destination_id, day_number);
