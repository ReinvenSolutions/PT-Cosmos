import type { Pool } from "pg";
import { logger } from "./logger";

/**
 * Alinea la tabla destinations con el esquema actual (columnas bloqueo).
 * Idempotente (IF NOT EXISTS). Evita 500 si olvidaste `npm run db:apply-pending` en esta BD.
 */
export async function ensureDestinationBloqueoColumns(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS is_bloqueo boolean NOT NULL DEFAULT false`,
    );
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS bloqueo_salida_fecha text`,
    );
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS bloqueo_cupos_disponibles integer`,
    );
    await pool.query(
      `UPDATE destinations SET is_bloqueo = true WHERE is_promotion = true AND is_bloqueo = false`,
    );
    logger.info("✅ Columnas de bloqueo en destinations listas (is_bloqueo, fechas, cupos)");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudieron asegurar columnas de bloqueo en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
