import type { Pool } from "pg";
import { logger } from "./logger";

/** Cupos por fecha de salida (idempotente). Evita 500 si la migración 0035 no se aplicó. */
export async function ensureDestinationAvailabilityTable(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS destination_availability (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        destination_id varchar NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
        date text NOT NULL,
        slots integer NOT NULL,
        price decimal(10, 2)
      );
      CREATE UNIQUE INDEX IF NOT EXISTS destination_availability_dest_date_unique
        ON destination_availability (destination_id, date);
      ALTER TABLE destination_availability ENABLE ROW LEVEL SECURITY;
    `);
    logger.info("✅ Tabla destination_availability lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar destination_availability", {
      code: e?.code,
      message: e?.message,
    });
  }
}
