
import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { inArray } from "drizzle-orm";

const TARGET_PLANS = [
  "Italia Turística - Euro Express",
  "España e Italia Turística - Euro Express",
  "Gran Tour de Europa - Euro Express"
];

async function clearAllowedDays() {
  console.log("Clearing allowedDays for European plans...\n");

  const plans = await db.select().from(destinations).where(inArray(destinations.name, TARGET_PLANS));

  for (const plan of plans) {
    console.log(`Processing ${plan.name}...`);
    
    await db.update(destinations)
      .set({ allowedDays: [] }) // Clear allowedDays
      .where(inArray(destinations.name, TARGET_PLANS));
      
    console.log(`  Cleared allowedDays.`);
  }
  
  console.log("\nDone.");
  process.exit(0);
}

clearAllowedDays().catch(console.error);
