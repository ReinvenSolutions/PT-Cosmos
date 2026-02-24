import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateGranTourEuropa() {
  console.log("Actualizando Gran Tour de Europa...");

  try {
    const destinationId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    await db.update(destinations)
      .set({
        duration: 17,
        description: "Un recorrido completo de 17 días por el corazón de Europa (incluye 1 día de vuelo desde Colombia). Inicia y termina en Madrid, visitando ciudades icónicas como Burdeos, París, Zúrich, Milán, Venecia, Florencia, Roma, Pisa, la Costa Azul y Barcelona. Incluye visitas panorámicas en las principales capitales y recorrido en barco en Venecia. Salidas domingos desde Colombia (llegas lunes a Madrid).",
        allowedDays: ['sunday', 'monday']
      })
      .where(eq(destinations.id, destinationId));

    console.log("✅ Gran Tour de Europa actualizado exitosamente!");
    console.log("   - Duración: 17 días / 15 noches");
    console.log("   - Días permitidos: Domingo y Lunes");
    
  } catch (error) {
    console.error("Error actualizando Gran Tour de Europa:", error);
    throw error;
  }
}

updateGranTourEuropa()
  .then(() => {
    console.log("Proceso completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
