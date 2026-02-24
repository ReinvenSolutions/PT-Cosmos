import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text`);
  console.log("Columna avatar_url agregada correctamente");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
