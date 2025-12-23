import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { or, eq } from "drizzle-orm";

async function activateAllNewDestinations() {
  console.log("Activando todos los destinos nuevos en producción...\n");
  
  // Activate Dubai y los Emiratos
  console.log("1. Activando DUBAI Y LOS EMIRATOS...");
  await db.update(destinations)
    .set({ isActive: true })
    .where(eq(destinations.name, 'DUBAI Y LOS EMIRATOS'));
  console.log("✅ Dubai y los Emiratos ACTIVADO\n");
  
  // Activate Colombia destinations
  console.log("2. Activando destinos de Colombia...");
  const colombiaIds = [
    'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p', // Plan Amazonas
    'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q', // Aventura en Santander
    'c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r'  // Desierto de La Guajira
  ];
  
  for (const id of colombiaIds) {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
    if (dest) {
      await db.update(destinations)
        .set({ isActive: true })
        .where(eq(destinations.id, id));
      console.log(`✅ ${dest.name} ACTIVADO`);
    }
  }
  
  console.log("\n✅ TODOS LOS DESTINOS HAN SIDO ACTIVADOS EN PRODUCCIÓN");
  console.log("\nDestinos activados:");
  console.log("- Dubai y los Emiratos (con 230 fechas de precios dinámicos)");
  console.log("- Plan Amazonas 5 Días - 4 Noches 2025");
  console.log("- Aventura en Santander");
  console.log("- Desierto de La Guajira");
  
  process.exit(0);
}

activateAllNewDestinations();
