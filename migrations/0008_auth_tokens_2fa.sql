-- Password reset tokens
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "token" varchar NOT NULL UNIQUE,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_token" ON "password_reset_tokens"("token");
CREATE INDEX IF NOT EXISTS "idx_password_reset_expires" ON "password_reset_tokens"("expires_at");

-- Two-factor sessions (pending login with 6-digit code)
CREATE TABLE IF NOT EXISTS "two_factor_sessions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "code" varchar(6) NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_2fa_session_expires" ON "two_factor_sessions"("expires_at");

-- Add two_factor_enabled to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "two_factor_enabled" boolean DEFAULT false;
