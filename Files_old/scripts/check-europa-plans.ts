import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkEuropePlans() {
  console.log("Verificando planes de Europa...\n");

  try {
    // Italia Turística
    const italia = await db.select().from(destinations).where(eq(destinations.name, "Italia Turística - Euro Express"));
    if (italia.length > 0) {
      console.log("=== Italia Turística - Euro Express ===");
      console.log(`Total priceTiers: ${italia[0].priceTiers?.length || 0}`);
      if (italia[0].priceTiers) {
        console.log("\nEnero-Febrero 2026:");
        italia[0].priceTiers.slice(0, 8).forEach((tier, idx) => {
          const date = new Date(tier.endDate);
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const dayName = dayNames[date.getDay()];
          console.log(`  ${idx + 1}. ${tier.endDate} (${dayName}) - $${tier.price} - isFlightDay: ${tier.isFlightDay || false}`);
        });
      }
    }

    console.log("\n");

    // España e Italia
    const espana = await db.select().from(destinations).where(eq(destinations.name, "España e Italia Turística - Euro Express"));
    if (espana.length > 0) {
      console.log("=== España e Italia Turística - Euro Express ===");
      console.log(`Total priceTiers: ${espana[0].priceTiers?.length || 0}`);
      if (espana[0].priceTiers) {
        console.log("\nAbril-Mayo 2026:");
        espana[0].priceTiers.slice(0, 12).forEach((tier, idx) => {
          const date = new Date(tier.endDate);
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const dayName = dayNames[date.getDay()];
          console.log(`  ${idx + 1}. ${tier.endDate} (${dayName}) - $${tier.price} - isFlightDay: ${tier.isFlightDay || false}`);
        });
      }
    }

    // Gran Tour
    const granTour = await db.select().from(destinations).where(eq(destinations.name, "Gran Tour de Europa - Euro Express"));
    if (granTour.length > 0) {
      console.log("\n=== Gran Tour de Europa - Euro Express ===");
      console.log(`Total priceTiers: ${granTour[0].priceTiers?.length || 0}`);
      if (granTour[0].priceTiers) {
        console.log("\nSample 2026:");
        granTour[0].priceTiers.slice(0, 12).forEach((tier, idx) => {
          const date = new Date(tier.endDate);
          const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
          const dayName = dayNames[date.getDay()];
          console.log(`  ${idx + 1}. ${tier.endDate} (${dayName}) - $${tier.price} - isFlightDay: ${tier.isFlightDay || false}`);
        });
      }
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkEuropePlans();
