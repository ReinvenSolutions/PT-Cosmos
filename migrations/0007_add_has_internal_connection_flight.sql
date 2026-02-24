-- Add flag to indicate if plan has internal/connection flight (shows flight upload in quote summary)
ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "has_internal_or_connection_flight" boolean DEFAULT false;
