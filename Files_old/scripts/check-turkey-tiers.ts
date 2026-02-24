import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkTurkeyTiers() {
  console.log("Verificando priceTiers de Turquía Esencial...\n");

  try {
    const turkey = await db
      .select()
      .from(destinations)
      .where(eq(destinations.name, "Turquía Esencial"));
    
    if (turkey.length === 0) {
      console.log("❌ No se encontró Turquía Esencial");
      process.exit(1);
    }

    const dest = turkey[0];
    console.log(`Nombre: ${dest.name}`);
    console.log(`Total priceTiers: ${dest.priceTiers?.length || 0}\n`);

    if (dest.priceTiers && dest.priceTiers.length > 0) {
      console.log("Primeros 10 priceTiers:");
      dest.priceTiers.slice(0, 10).forEach((tier, idx) => {
        console.log(`  ${idx + 1}. ${tier.endDate} - $${tier.price} - isFlightDay: ${tier.isFlightDay || false} - label: ${tier.flightLabel || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkTurkeyTiers();
