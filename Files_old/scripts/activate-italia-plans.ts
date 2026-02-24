import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { or, eq } from "drizzle-orm";

async function activateItaliaPlans() {
  console.log("Activando planes de Italia en producción...\n");

  try {
    const result = await db
      .update(destinations)
      .set({ isActive: true })
      .where(
        or(
          eq(destinations.name, "Italia Turística - Euro Express"),
          eq(destinations.name, "España e Italia Turística - Euro Express")
        )
      )
      .returning();

    console.log(`✅ Activados ${result.length} planes de Italia:\n`);
    result.forEach(plan => {
      console.log(`   - ${plan.name}`);
      console.log(`     isActive: ${plan.isActive}`);
      console.log(`     displayOrder: ${plan.displayOrder}`);
      console.log(`     priceTiers: ${plan.priceTiers?.length || 0} fechas`);
      console.log(`     upgrades: ${plan.upgrades?.length || 0} mejoras\n`);
    });

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

activateItaliaPlans();
