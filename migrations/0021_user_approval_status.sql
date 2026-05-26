-- Estado de aprobación para usuarios que se registran por la plataforma
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "approval_status" text DEFAULT 'approved' NOT NULL;
