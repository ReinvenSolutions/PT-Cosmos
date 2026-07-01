import type { Pool } from "pg";
import { logger } from "./logger";

/** Tabla tool_itineraries para el contador de días (idempotente). */
export async function ensureToolItinerariesTable(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tool_itineraries (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        start_date VARCHAR(10) NOT NULL,
        days JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_user_tool_itinerary UNIQUE (user_id)
      )
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_tool_itineraries_user_id ON tool_itineraries(user_id)
    `);
    logger.info("✅ Tabla tool_itineraries lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar tool_itineraries", {
      code: e?.code,
      message: e?.message,
    });
  }
}
