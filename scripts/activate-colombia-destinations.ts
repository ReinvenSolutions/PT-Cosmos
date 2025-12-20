import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function activateColombiaDestinations() {
  console.log("Activando destinos de Colombia...\n");
  
  const colombiaDestinations = [
    'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p', // Plan Amazonas
    'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q', // Aventura en Santander
    'c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r'  // Desierto de La Guajira
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
