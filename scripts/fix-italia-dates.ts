import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixItaliaDates() {
  console.log("Corrigiendo fechas de Italia Turística (jueves → viernes)...\n");

  try {
    const italia = await db.select().from(destinations).where(eq(destinations.name, "Italia Turística - Euro Express"));
    
    if (italia.length === 0) {
      console.log("❌ No se encontró Italia Turística");
      process.exit(1);
    }

    if (!italia[0].priceTiers) {
      console.log("❌ Italia Turística no tiene priceTiers");
      process.exit(1);
    }

    const newTiers = italia[0].priceTiers.map(tier => {
      // Adelantar cada fecha 1 día
      const date = new Date(tier.endDate);
      date.setDate(date.getDate() + 1);
      const newDate = date.toISOString().split('T')[0];
      
      return {
        ...tier,
        endDate: newDate,
        startDate: tier.startDate ? newDate : undefined
      };
    });

    await db.update(destinations)
      .set({ priceTiers: newTiers })
      .where(eq(destinations.name, "Italia Turística - Euro Express"));

    console.log(`✅ Corregidas ${newTiers.length} fechas`);
    console.log("\nPrimeras 5 fechas corregidas:");
    newTiers.slice(0, 5).forEach((tier, idx) => {
      const date = new Date(tier.endDate);
      const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      console.log(`  ${idx + 1}. ${tier.endDate} (${dayNames[date.getDay()]}) - isFlightDay: ${tier.isFlightDay || false}`);
    });
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

fixItaliaDates();
