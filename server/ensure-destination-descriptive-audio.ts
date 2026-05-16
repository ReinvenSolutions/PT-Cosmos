import type { Pool } from "pg";
import { logger } from "./logger";

/** Columna descriptive_audio_url en destinations (idempotente). */
export async function ensureDestinationDescriptiveAudioColumn(pool: InstanceType<typeof Pool>): Promise<void> {
  try {
    await pool.query(
      `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS descriptive_audio_url text`,
    );
    logger.info("✅ Columna descriptive_audio_url en destinations lista");
  } catch (err: unknown) {
    const e = err as { message?: string; code?: string };
    logger.warn("⚠️ No se pudo asegurar descriptive_audio_url en destinations", {
      code: e?.code,
      message: e?.message,
    });
  }
}
