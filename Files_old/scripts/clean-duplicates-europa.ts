import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, ne } from "drizzle-orm";

async function cleanDuplicates() {
  console.log("🧹 Limpiando destinos duplicados...\n");

  try {
    const correctId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    // Buscar todos los destinos de Europa
    const allDestinations = await db.select().from(destinations);
    const europaDests = allDestinations.filter(d => 
      (d.name.toLowerCase().includes('gran tour') || 
       d.name.toLowerCase().includes('europa')) &&
      d.id !== correctId
    );
    
    console.log(`Destinos encontrados (excluyendo el correcto): ${europaDests.length}\n`);
    
    if (europaDests.length > 0) {
      for (const dest of europaDests) {
        console.log(`🗑️  Eliminando: ${dest.name} (${dest.id})`);
        
        // Eliminar datos relacionados
        await db.delete(hotels).where(eq(hotels.destinationId, dest.id));
        await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
        await db.delete(inclusions).where(eq(inclusions.destinationId, dest.id));
        await db.delete(exclusions).where(eq(exclusions.destinationId, dest.id));
        await db.delete(destinations).where(eq(destinations.id, dest.id));
        
        console.log(`   ✅ Eliminado\n`);
      }
    } else {
      console.log("✅ No se encontraron duplicados\n");
    }
    
    // Verificar destino correcto
    const [correct] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, correctId));
    
    if (correct) {
      console.log("✅ Destino correcto verificado:");
      console.log(`   ${correct.name} (${correct.id})`);
      console.log(`   ${correct.duration} días / ${correct.nights} noches`);
    }
    
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

cleanDuplicates()
  .then(() => {
    console.log("\n✨ Limpieza completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
