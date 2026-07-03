import type { Pool } from "pg";
import { logger } from "./logger";

/** Columnas del cotizador de millas en users (idempotente). */
export async function ensureUserMilesColumns(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_type text DEFAULT 'none' NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_value numeric(12, 2) DEFAULT 0 NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_programs_allowed text DEFAULT 'both' NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_type_lifemiles text DEFAULT 'none' NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_value_lifemiles numeric(12, 2) DEFAULT 0 NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_type_smiles text DEFAULT 'none' NOT NULL`,
    );
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS miles_markup_value_smiles numeric(12, 2) DEFAULT 0 NOT NULL`,
    );
    logger.info("✅ Columnas de millas en users listas");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudieron asegurar columnas de millas en users", {
      code: e?.code,
      message: e?.message,
    });
  }
}
