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
];

async function main() {
  const client = await pool.connect();
  try {
    console.log("📦 Aplicando migraciones pendientes...\n");

    for (const filename of MIGRATIONS) {
      const sqlPath = join(process.cwd(), "migrations", filename);
      const sql = readFileSync(sqlPath, "utf-8");
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const stmt of statements) {
        const fullSql = stmt + ";";
        try {
          await client.query(fullSql);
          console.log(`  ✓ ${filename}`);
        } catch (err: unknown) {
          const e = err as { code?: string; message?: string };
          if (e?.code === "42701") {
            console.log(`  ⏭ ${filename} (columna ya existe)`);
          } else {
            throw err;
          }
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
