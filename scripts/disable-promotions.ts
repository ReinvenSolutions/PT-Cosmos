
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq, inArray } from "drizzle-orm";

async function disablePromotions() {
  console.log("Desactivando promociones para Egipto y Lisboa...");

  const targetDestinations = [
    "Egipto (Con Crucero) + Emiratos: Salida Especial Mayo",
    "Lisboa, España y Roma – Euro Express"
  ];

  const result = await db.update(destinations)
    .set({ isPromotion: false })
    .where(inArray(destinations.name, targetDestinations))
    .returning({ name: destinations.name, isPromotion: destinations.isPromotion });

  console.log("Actualizados:");
  result.forEach(d => console.log(`- ${d.name}: isPromotion = ${d.isPromotion}`));
  
  process.exit(0);
}

disablePromotions();
