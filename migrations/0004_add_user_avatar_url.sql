-- Add avatar_url to users table for profile images
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatar_url" text;
