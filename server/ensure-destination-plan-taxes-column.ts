import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna plan_taxes en destinations (idempotente). */
export async function ensureDestinationPlanTaxesColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(`ALTER TABLE destinations ADD COLUMN IF NOT EXISTS plan_taxes json`);
    logger.info("✅ Columna plan_taxes en destinations lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar plan_taxes en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
