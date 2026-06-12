import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna discount_percentage en users (idempotente). */
export async function ensureUserDiscountColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_percentage numeric(5, 2) DEFAULT 0 NOT NULL`,
    );
    logger.info("✅ Columna discount_percentage en users lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar discount_percentage en users", {
      code: e?.code,
      message: e?.message,
    });
  }
}
