import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna recommendations en destinations (idempotente). */
export async function ensureDestinationRecommendationsColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS recommendations text`,
    );
    logger.info("✅ Columna recommendations en destinations lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar recommendations en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
