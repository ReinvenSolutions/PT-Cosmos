/**
 * Establece two_factor_enabled = true para todos los usuarios.
 * 2FA queda activado por defecto; el admin puede desactivarlo por usuario en Editar.
 */
import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL no configurado");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });

  try {
    const res = await pool.query(
      "UPDATE users SET two_factor_enabled = true WHERE two_factor_enabled = false RETURNING id"
    );
    console.log(`✅ 2FA activado por defecto para ${res.rowCount} usuario(s)`);
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
