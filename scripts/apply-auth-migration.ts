/**
 * Aplica solo la migración 0008 (auth tokens, 2FA) sin ejecutar
 * el flujo completo de drizzle-kit migrate.
 */
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL no configurado");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const sqlPath = path.join(__dirname, "..", "migrations", "0008_auth_tokens_2fa.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8");

  try {
    await pool.query(sql);
    console.log("✅ Migración 0008 aplicada correctamente");
  } catch (err: any) {
    if (err.code === "42701") {
      console.log("ℹ️ La columna two_factor_enabled ya existe. Migración aplicada previamente.");
    } else {
      console.error("❌ Error:", err.message);
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

run();
