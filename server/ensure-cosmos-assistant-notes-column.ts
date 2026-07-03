import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna cosmos_assistant_notes en destinations (idempotente). */
export async function ensureCosmosAssistantNotesColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS cosmos_assistant_notes text`,
    );
    logger.info("✅ Columna cosmos_assistant_notes en destinations lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar cosmos_assistant_notes en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
