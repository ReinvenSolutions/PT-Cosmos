import type { Pool } from "pg";
import { logger } from "./logger";

/** Renombra roles legacy advisor/agency → agency/provider (una sola vez, idempotente). */
export async function ensureUserRoleRename(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    const { rows } = await pool.query<{ n: number }>(
      `SELECT COUNT(*)::int AS n FROM users WHERE role = 'advisor'`,
    );
    if ((rows[0]?.n ?? 0) === 0) {
      return;
    }
    await pool.query(`UPDATE users SET role = 'provider' WHERE role = 'agency'`);
    await pool.query(`UPDATE users SET role = 'agency' WHERE role = 'advisor'`);
    logger.info("✅ Roles de usuario renombrados (advisor→agency, agency→provider)");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo renombrar roles de usuario", {
      code: e?.code,
      message: e?.message,
    });
  }
}
