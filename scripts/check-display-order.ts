import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";

async function checkDisplayOrder() {
  const results = await db.select({
    name: destinations.name,
    displayOrder: destinations.displayOrder
  })
  .from(destinations)
  .orderBy(destinations.displayOrder);
  
  console.log("\n=== Display Order de Destinos ===\n");
  results.forEach((r, i) => {
    console.log(`${i + 1}. [${r.displayOrder || 'NULL'}] ${r.name}`);
  });
  console.log("\n");
}

checkDisplayOrder().then(() => process.exit(0));
