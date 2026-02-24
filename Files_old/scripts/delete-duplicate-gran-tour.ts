import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and, ne } from "drizzle-orm";

async function deleteDuplicateGranTour() {
  console.log("Eliminando destino duplicado de Gran Tour de Europa...");

  try {
    const correctId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    // Buscar todos los destinos con nombre "Gran Tour de Europa"
    const allGranTour = await db.select()
      .from(destinations)
      .where(eq(destinations.name, "Gran Tour de Europa"));
    
    console.log(`\nEncontrados ${allGranTour.length} destinos con nombre "Gran Tour de Europa":`);
    allGranTour.forEach(d => {
      console.log(`  - ID: ${d.id}`);
      console.log(`    Duración: ${d.duration} días / ${d.nights} noches`);
      console.log(`    Activo: ${d.isActive}`);
    });

    // Eliminar todos los que NO sean el ID correcto
    const duplicates = allGranTour.filter(d => d.id !== correctId);
    
    if (duplicates.length > 0) {
      console.log(`\n🗑️  Eliminando ${duplicates.length} duplicado(s)...`);
      
      for (const dup of duplicates) {
        // Eliminar datos relacionados primero
        await db.delete(hotels).where(eq(hotels.destinationId, dup.id));
        await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, dup.id));
        await db.delete(inclusions).where(eq(inclusions.destinationId, dup.id));
        await db.delete(exclusions).where(eq(exclusions.destinationId, dup.id));
        
        // Eliminar el destino
        await db.delete(destinations).where(eq(destinations.id, dup.id));
        
        console.log(`  ✅ Eliminado destino duplicado: ${dup.id}`);
      }
    } else {
      console.log("\n✅ No se encontraron duplicados");
    }

    // Verificar el destino correcto
    const [correct] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, correctId));
    
    if (correct) {
      console.log("\n✅ Destino correcto verificado:");
      console.log(`   ID: ${correct.id}`);
      console.log(`   Nombre: ${correct.name}`);
      console.log(`   Duración: ${correct.duration} días / ${correct.nights} noches`);
      console.log(`   Días permitidos: ${correct.allowedDays}`);
      console.log(`   Activo: ${correct.isActive}`);
    } else {
      console.log("\n❌ ERROR: No se encontró el destino correcto");
    }
    
  } catch (error) {
    console.error("Error eliminando duplicados:", error);
    throw error;
  }
}

deleteDuplicateGranTour()
  .then(() => {
    console.log("\n✨ Proceso completado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
