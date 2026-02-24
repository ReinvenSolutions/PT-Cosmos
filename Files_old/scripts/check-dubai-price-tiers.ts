import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkDubaiPriceTiers() {
  console.log("Verificando PriceTiers de Dubai y Egipto...\n");

  try {
    const dubai = await db.select().from(destinations).where(eq(destinations.name, "DUBAI Maravilloso")).limit(1);
    const egipto = await db.select().from(destinations).where(eq(destinations.name, "Egipto (Con Crucero) + Emiratos Árabes")).limit(1);
    
    if (dubai.length > 0) {
      console.log("DUBAI Maravilloso:");
      console.log(JSON.stringify(dubai[0].priceTiers, null, 2));
      console.log("\n");
    }
    
    if (egipto.length > 0) {
      console.log("Egipto + Emiratos:");
      console.log(JSON.stringify(egipto[0].priceTiers, null, 2));
      console.log("\n");
    }
    
    const granTour = await db.select().from(destinations).where(eq(destinations.name, "Gran Tour de Europa")).limit(1);
    if (granTour.length > 0) {
      console.log("Gran Tour de Europa (primeras 5 fechas):");
      console.log(JSON.stringify(granTour[0].priceTiers?.slice(0, 5), null, 2));
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkDubaiPriceTiers();
