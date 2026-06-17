-- Migration: Enable RLS on tables created after 0009_enable_rls_security.sql
-- Fixes Security Advisor: tutorial_courses, tutorial_lessons, tutorial_lesson_progress, app_settings
--
-- Context: Same as 0009 — Express uses direct PostgreSQL (bypasses RLS).
-- Enabling RLS blocks PostgREST (anon/authenticated) access without policies.

ALTER TABLE IF EXISTS "public"."app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_lesson_progress" ENABLE ROW LEVEL SECURITY;
