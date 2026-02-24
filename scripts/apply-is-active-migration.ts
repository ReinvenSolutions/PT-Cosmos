/**
 * Aplica la migración 0005_add_user_is_active.sql
 * Ejecutar: npx tsx scripts/apply-is-active-migration.ts
 */
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL no está definida");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  try {
    await pool.query(`
      ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_active" boolean DEFAULT true NOT NULL;
    `);
    console.log("✅ Columna is_active agregada a la tabla users");
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
