import type { Pool } from "pg";
import { logger } from "./logger";

const DEFAULT_MODULES =
  '{"quote":true,"quoteExpress":true,"dayCounter":true,"milesCalculator":true,"academy":true,"cosmos":false,"cosmosVoice":false}';
const PROVIDER_MODULES =
  '{"quote":true,"quoteExpress":true,"dayCounter":true,"milesCalculator":true,"academy":false,"cosmos":false,"cosmosVoice":false}';

/** Permisos de módulos por usuario (idempotente). */
export async function ensureUserEnabledModulesColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    const existing = await pool.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'enabled_modules'
       ) AS exists`,
    );

    if (!existing.rows[0]?.exists) {
      await pool.query(
        `ALTER TABLE users ADD COLUMN enabled_modules json DEFAULT '${DEFAULT_MODULES}'::json NOT NULL`,
      );
      await pool.query(
        `UPDATE users SET enabled_modules = '${PROVIDER_MODULES}'::json WHERE role = 'provider'`,
      );
    }

    logger.info("✅ Columna enabled_modules en users lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar columna enabled_modules en users", {
      code: e?.code,
      message: e?.message,
    });
  }
}
