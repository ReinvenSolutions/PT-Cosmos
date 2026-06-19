import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna user_id en clients y backfill desde cotizaciones (idempotente). */
export async function ensureClientsUserIdColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE clients ADD COLUMN IF NOT EXISTS user_id VARCHAR REFERENCES users(id)`,
    );
    await pool.query(`
      UPDATE clients c
      SET user_id = sub.user_id
      FROM (
        SELECT DISTINCT ON (client_id) client_id, user_id
        FROM quotes
        ORDER BY client_id, created_at ASC
      ) sub
      WHERE c.id = sub.client_id AND c.user_id IS NULL
    `);
    logger.info("✅ Columna clients.user_id lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar clients.user_id", {
      code: e?.code,
      message: e?.message,
    });
  }
}
