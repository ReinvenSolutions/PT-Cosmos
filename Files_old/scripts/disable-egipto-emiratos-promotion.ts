
import { db } from "../server/db";
import { destinations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function disablePromotion() {
  console.log("Desactivando promoción para Egipto y Emiratos...");

  try {
    const result = await db
      .update(destinations)
      .set({ isPromotion: false })
      .where(eq(destinations.name, "Egipto (Con Crucero) + Emiratos: Salida Especial Mayo"))
      .returning();

    if (result.length > 0) {
      console.log(`Promoción desactivada para: ${result[0].name}`);
    } else {
      console.log("No se encontró el destino 'Egipto (Con Crucero) + Emiratos: Salida Especial Mayo'");
    }
  } catch (error) {
    console.error("Error al actualizar el destino:", error);
  } finally {
    process.exit(0);
  }
}

disablePromotion();
