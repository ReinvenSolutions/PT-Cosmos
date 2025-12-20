import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateDisplayOrder() {
  console.log("Actualizando orden de destinos...\n");

  const orderedDestinations = [
    { name: "Turquía Esencial", order: 1 },
    { name: "DUBAI Maravilloso", order: 2 },
    { name: "DUBAI Y LOS EMIRATOS", order: 3 },
    { name: "Auroras boreales finlandia", order: 4 },
    { name: "Egipto (Con Crucero) + Emiratos Árabes", order: 5 },
    { name: "Gran Tour de Europa", order: 6 },
    { name: "Italia Turística - Euro Express", order: 7 },
    { name: "España e Italia Turística - Euro Express", order: 8 },
    { name: "Lo Mejor de Cusco", order: 9 },
    { name: "Tour Cusco Básico + Huacachina", order: 10 },
    { name: "Tour Cusco Básico + Paracas - Huacachina - Nazca", order: 11 },
    { name: "Lo Mejor de Cusco + Lima", order: 12 },
    { name: "Tour Cusco Completo + Lima, Paracas, Nazca, Huacachina", order: 13 },
    { name: "Plan Amazonas 5 Días - 4 Noches 2025", order: 14 },
    { name: "Aventura en Santander", order: 15 },
    { name: "Desierto de La Guajira", order: 16 }
  ];

  try {
    for (const dest of orderedDestinations) {
      const result = await db
        .update(destinations)
        .set({ displayOrder: dest.order })
        .where(eq(destinations.name, dest.name))
        .returning();

      if (result.length > 0) {
        console.log(`✅ [${dest.order}] ${dest.name}`);
      } else {
        console.log(`⚠️  [${dest.order}] ${dest.name} - NO ENCONTRADO`);
      }
    }

    console.log("\n✅ Orden actualizado correctamente");
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

updateDisplayOrder();
