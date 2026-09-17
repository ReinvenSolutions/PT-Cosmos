import type { Pool } from "pg";
import { logger } from "./logger";

/** Tablas de sesiones/transcripciones de Cosmos (idempotente). */
export async function ensureCosmosSessionsTables(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cosmos_sessions (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        channel text NOT NULL,
        room_name text,
        current_plan_id varchar,
        started_at timestamptz NOT NULL DEFAULT now(),
        ended_at timestamptz,
        metadata jsonb
      );
      CREATE INDEX IF NOT EXISTS cosmos_sessions_user_idx ON cosmos_sessions (user_id);
      CREATE INDEX IF NOT EXISTS cosmos_sessions_started_idx ON cosmos_sessions (started_at DESC);
      CREATE INDEX IF NOT EXISTS cosmos_sessions_channel_idx ON cosmos_sessions (channel);
      CREATE TABLE IF NOT EXISTS cosmos_session_messages (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id varchar NOT NULL REFERENCES cosmos_sessions(id) ON DELETE CASCADE,
        role text NOT NULL,
        content text NOT NULL,
        tool_name text,
        created_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS cosmos_session_messages_session_idx
        ON cosmos_session_messages (session_id, created_at);
      ALTER TABLE cosmos_sessions ENABLE ROW LEVEL SECURITY;
      ALTER TABLE cosmos_session_messages ENABLE ROW LEVEL SECURITY;
    `);
    logger.info("✅ Tablas cosmos_sessions listas");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudieron asegurar tablas cosmos_sessions", {
      code: e?.code,
      message: e?.message,
    });
  }
}
