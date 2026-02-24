
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function disablePeruPromotion() {
  console.log("Desactivando promoción para Perú 7D - 6N / Lima y Cusco...");

  await db.update(destinations)
    .set({ isPromotion: false })
    .where(eq(destinations.name, "Perú 7D - 6N / Lima y Cusco"));

  console.log("Promoción desactivada.");
  process.exit(0);
}

disablePeruPromotion();
