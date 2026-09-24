import type { Pool } from "pg";
import { logger } from "./logger";

/** Tabla de contextos estratégicos de Cosmos (idempotente). */
export async function ensureCosmosStrategicContextsTable(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cosmos_strategic_contexts (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        kind text NOT NULL,
        content text NOT NULL DEFAULT '',
        destination_id varchar REFERENCES destinations(id) ON DELETE SET NULL,
        pinned boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT cosmos_strategic_contexts_kind_check CHECK (kind IN ('destination', 'activity'))
      );
      CREATE INDEX IF NOT EXISTS cosmos_strategic_contexts_updated_idx
        ON cosmos_strategic_contexts (updated_at DESC);
      CREATE INDEX IF NOT EXISTS cosmos_strategic_contexts_destination_idx
        ON cosmos_strategic_contexts (destination_id);
      ALTER TABLE cosmos_strategic_contexts ENABLE ROW LEVEL SECURITY;
    `);
    logger.info("✅ Tabla cosmos_strategic_contexts lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar cosmos_strategic_contexts", {
      code: e?.code,
      message: e?.message,
    });
  }
}
