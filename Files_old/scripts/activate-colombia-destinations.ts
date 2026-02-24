import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function activateColombiaDestinations() {
  console.log("Activando destinos de Colombia...\n");
  
  const colombiaDestinations = [
    'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d', // Plan Amazonas
    'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e', // Aventura en Santander
    'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f'  // Desierto de La Guajira
  ];
  
  for (const id of colombiaDestinations) {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
    
    if (dest) {
      await db.update(destinations)
        .set({ isActive: true })
        .where(eq(destinations.id, id));
      
      console.log(`✅ ${dest.name} - ACTIVADO`);
    }
  }
  
  console.log("\n✅ Todos los destinos de Colombia han sido activados");
  process.exit(0);
}

activateColombiaDestinations();
