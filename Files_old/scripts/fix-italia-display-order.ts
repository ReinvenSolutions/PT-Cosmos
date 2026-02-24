import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateDisplayOrder() {
  console.log("Actualizando displayOrder de Italia Turística...");
  
  await db.update(destinations)
    .set({ displayOrder: 6 })
    .where(eq(destinations.name, "Italia Turística - Euro Express"));
  
  console.log("✅ DisplayOrder actualizado a 6 (después de Gran Tour de Europa)");
}

updateDisplayOrder().then(() => process.exit(0));
