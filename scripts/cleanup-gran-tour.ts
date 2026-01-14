import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";
import { eq, and } from "drizzle-orm";

async function cleanupGranTour() {
  try {
    console.log("🧹 Limpiando duplicados del Gran Tour de Europa...\n");
    
    // Buscar todos los "Gran Tour de Europa"
    const allGranTour = await db
      .select()
      .from(destinations)
      .where(eq(destinations.name, "Gran Tour de Europa"));
    
    console.log(`Encontrados ${allGranTour.length} destinos "Gran Tour de Europa":`);
    allGranTour.forEach(dest => {
      console.log(`  - ID: ${dest.id}, Activo: ${dest.isActive}`);
    });
    
    // El ID correcto según seed-data.ts
    const correctId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    // Eliminar todos los que NO sean el correcto
    for (const dest of allGranTour) {
      if (dest.id !== correctId) {
        console.log(`\n🗑️  Eliminando destino duplicado con ID: ${dest.id}`);
        
        // Eliminar datos relacionados
        await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
        await db.delete(hotels).where(eq(hotels.destinationId, dest.id));
        await db.delete(inclusions).where(eq(inclusions.destinationId, dest.id));
        await db.delete(exclusions).where(eq(exclusions.destinationId, dest.id));
        
        // Eliminar el destino
        await db.delete(destinations).where(eq(destinations.id, dest.id));
        
        console.log(`✅ Destino ${dest.id} eliminado`);
      }
    }
    
    // Verificar si existe el destino correcto
    const [correctDest] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, correctId));
    
    if (correctDest) {
      console.log(`\n✅ El destino correcto existe con ID: ${correctId}`);
      console.log(`   Nombre: ${correctDest.name}`);
      console.log(`   Activo: ${correctDest.isActive}`);
    } else {
      console.log(`\n⚠️  El destino correcto NO existe. Necesita ser creado por el script de sync.`);
    }
    
    console.log("\n✅ Limpieza completada");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

cleanupGranTour();
