-- Migration: Enable Row Level Security (RLS) on all public tables
-- Fixes Security Advisor vulnerabilities: RLS Disabled + Sensitive Columns Exposed
--
-- Context: This app uses Express + Drizzle with direct PostgreSQL connection (DATABASE_URL).
-- Supabase exposes PostgREST by default. Without RLS, anon/authenticated could access data.
-- Enabling RLS blocks PostgREST access. The app's postgres connection bypasses RLS (superuser).
--
-- Tables covered: clients, destinations, destination_images, exclusions, hotels, inclusions,
-- itinerary_days, password_reset_tokens, quote_destinations, quote_logs, quotes, sessions,
-- terms_conditions, two_factor_sessions, users

-- Enable RLS on all tables in public schema
ALTER TABLE IF EXISTS "public"."clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."destinations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."destination_images" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."exclusions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."hotels" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."inclusions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."itinerary_days" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."quote_destinations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."quote_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."quotes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."terms_conditions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."two_factor_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- Sessions: connect-pg-simple uses "sessions" (tableName in server config)
-- Migration 0000 created "session" (singular). Enable both if they exist.
ALTER TABLE IF EXISTS "public"."sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE IF EXISTS "public"."session" ENABLE ROW LEVEL SECURITY;
