#!/usr/bin/env npx tsx
/**
 * Aplica la migración de RLS (Row Level Security) directamente.
 * Útil cuando drizzle-kit migrate tiene conflictos con migraciones previas.
 *
 * Uso: npm run db:apply-rls
 * Requiere: DATABASE_URL en .env
 */

import "dotenv/config";
import { Pool } from "pg";
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no está definida. Configura .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

const RLS_SQL = `
-- Enable RLS on all public tables
ALTER TABLE IF EXISTS "public"."clients" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."destinations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."destination_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."exclusions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."hotels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."inclusions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."itinerary_days" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."password_reset_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."quote_destinations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."quote_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."terms_conditions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."two_factor_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."app_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_lessons" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "public"."tutorial_lesson_progress" ENABLE ROW LEVEL SECURITY;
`;

async function main() {
  const client = await pool.connect();
  try {
    console.log("🔒 Aplicando RLS a todas las tablas...");
    const statements = RLS_SQL.trim()
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      if (stmt.startsWith("--")) continue;
      const sql = stmt + ";";
      await client.query(sql);
      const tableMatch = sql.match(/ALTER TABLE[^"]*"([^"]+)"/);
      const table = tableMatch ? tableMatch[1] : "?";
      console.log(`  ✓ ${table}`);
    }
    console.log("\n✅ RLS habilitado correctamente en todas las tablas.");
    console.log("   Verifica en Supabase Dashboard → Database → Security Advisor");
  } catch (err) {
    console.error("❌ Error:", (err as Error).message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
