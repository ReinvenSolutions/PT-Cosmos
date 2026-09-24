import type { Pool } from "pg";
import { logger } from "./logger";

/** Columnas de posición del vuelo interno (migración 0037, idempotente). */
export async function ensureInternalFlightPlacementColumns(
  pool: InstanceType<typeof Pool>,
): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS internal_flight_after_day integer`,
    );
    await pool.query(
      `ALTER TABLE quotes ADD COLUMN IF NOT EXISTS domestic_flight_images_by_destination json`,
    );
    logger.info("✅ Columnas de vuelo interno listas");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudieron asegurar columnas de vuelo interno", {
      code: e?.code,
      message: e?.message,
    });
  }
}
