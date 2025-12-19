import 'dotenv/config';
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE "destinations" ADD COLUMN IF NOT EXISTS "upgrades" json;`);
    console.log("Column 'upgrades' added successfully.");
  } catch (error) {
    console.error("Error adding column:", error);
  }
  process.exit(0);
}

main();
