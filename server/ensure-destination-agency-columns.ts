import type { Pool } from "pg";
import { logger } from "./logger";

/** Columnas de propiedad de plan por agencia (idempotente). */
export async function ensureDestinationAgencyColumns(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS created_by_user_id varchar REFERENCES users(id) ON DELETE SET NULL`,
    );
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS agency_display_name text`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS destinations_created_by_user_id_idx ON destinations (created_by_user_id)`,
    );
    logger.info("✅ Columnas de agencia en destinations listas");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudieron asegurar columnas de agencia en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
