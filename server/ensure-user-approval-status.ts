import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna approval_status en users (idempotente). */
export async function ensureUserApprovalStatusColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' NOT NULL`,
    );
    logger.info("✅ Columna approval_status en users lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar approval_status en users", {
      code: e?.code,
      message: e?.message,
    });
  }
}
