import "dotenv/config";
import { pool } from "../server/db";

async function main() {
  await pool.query(
    `ALTER TABLE destinations ADD COLUMN IF NOT EXISTS recommendations text`,
  );
  const check = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'destinations' AND column_name = 'recommendations'`,
  );
  if (check.rows.length) {
    console.log("OK: columna recommendations existe en destinations");
  } else {
    console.error("ERROR: columna recommendations no encontrada");
    process.exit(1);
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
