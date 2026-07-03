#!/usr/bin/env npx tsx
/**
 * Aplica las migraciones pendientes 0010 y 0011 directamente.
 * Útil cuando drizzle-kit migrate tiene conflictos (ej. tablas ya existentes).
 *
 * Uso: npx tsx scripts/apply-pending-migrations.ts
 * Requiere: DATABASE_URL en .env
 */

import "dotenv/config";
import { Pool } from "pg";
import { readFileSync } from "fs";
import { join } from "path";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida. Configura .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const MIGRATIONS = [
  "0010_add_requires_extra_day.sql",
  "0011_add_selected_upgrades.sql",
  "0012_add_card_tooltip.sql",
  "0013_app_settings.sql",
  "0014_destination_hotel_gallery.sql",
  "0015_destination_adicionales_gallery.sql",
  "0016_quote_connection_flight.sql",
  "0017_tutorial_academy.sql",
  "0018_destinations_bloqueos.sql",
  "0019_destinations_descriptive_audio.sql",
  "0020_destinations_recommendations.sql",
  "0021_user_approval_status.sql",
  "0022_destinations_agency.sql",
  "0023_user_discount_percentage.sql",
  "0024_quote_taxes_and_fees.sql",
  "0025_destination_plan_taxes.sql",
  "0026_enable_rls_new_tables.sql",
  "0027_destinations_cosmos_assistant_notes.sql",
  "0028_rename_user_roles.sql",
  "0029_clients_user_id.sql",
  "0030_tool_itineraries.sql",
  "0031_user_miles_settings.sql",
  "0032_per_program_miles_markup.sql",
];

const SKIPPABLE_ERROR_CODES = new Set(["42701", "42P07", "42710", "42P16"]);

async function main() {
  const client = await pool.connect();
  try {
    console.log("📦 Aplicando migraciones pendientes...\n");

    for (const filename of MIGRATIONS) {
      const sqlPath = join(process.cwd(), "migrations", filename);
      const sql = readFileSync(sqlPath, "utf-8").trim();
      if (!sql) continue;

      try {
        await client.query(sql);
        console.log(`  ✓ ${filename}`);
      } catch (err: unknown) {
        const e = err as { code?: string; message?: string };
        if (e?.code && SKIPPABLE_ERROR_CODES.has(e.code)) {
          console.log(`  ⏭ ${filename} (ya aplicado: ${e.code})`);
        } else {
          throw err;
        }
      }
    }

    console.log("\n✅ Migraciones aplicadas correctamente.");
  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
