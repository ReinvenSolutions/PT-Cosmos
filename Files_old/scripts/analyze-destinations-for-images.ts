
import { db } from "../server/db";
import { destinations, itineraryDays } from "../shared/schema";
import { eq } from "drizzle-orm";

async function analyzeDestinations() {
  const allDestinations = await db.select().from(destinations);
  
  console.log("Analizando destinos para sugerencias de imágenes...\n");

  for (const dest of allDestinations) {
    const days = await db.select().from(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
    
    console.log(`DESTINO: ${dest.name} (${dest.country})`);
    console.log(`Días: ${dest.duration}`);
    console.log("Lugares clave mencionados en itinerario:");
    
    const locations = new Set<string>();
    days.forEach(day => {
        if (day.location) locations.add(day.location);
        // Extract potential locations from title or description if location is missing
        // This is a simple heuristic
    });
    
    if (locations.size > 0) {
        console.log([...locations].join(", "));
    } else {
        // Fallback: print day titles to infer locations
        days.forEach(day => console.log(`  - Día ${day.dayNumber}: ${day.title}`));
    }
    console.log("-".repeat(50));
  }
  
  process.exit(0);
}

analyzeDestinations();
