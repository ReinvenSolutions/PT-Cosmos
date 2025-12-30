import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions, destinationImages } from "@shared/schema";
import { seedDestinations } from "../shared/seed-data";
import { eq } from "drizzle-orm";

async function cleanupAllDuplicates() {
  try {
    console.log("🧹 Limpiando TODOS los duplicados...\n");
    
    // Para cada destino en seed-data, buscar duplicados
    for (const seedDest of seedDestinations) {
      console.log(`\n📍 Procesando: ${seedDest.name}`);
      
      // Buscar todos los destinos con este nombre y país
      const allDests = await db
        .select()
        .from(destinations)
        .where(eq(destinations.name, seedDest.name));
      
      if (allDests.length === 0) {
        console.log(`   ⚠️  No existe en la BD - será creado por sync-data`);
        continue;
      }
      
      if (allDests.length === 1 && allDests[0].id === seedDest.id) {
        console.log(`   ✅ Solo existe la versión correcta`);
        continue;
      }
      
      console.log(`   Encontrados ${allDests.length} destinos:`);
      allDests.forEach(dest => {
        const isCorrect = dest.id === seedDest.id;
        console.log(`     - ID: ${dest.id} ${isCorrect ? '✅ (correcto)' : '❌ (duplicado)'}`);
      });
      
      // Eliminar todos los que NO sean el correcto
      for (const dest of allDests) {
        if (dest.id !== seedDest.id) {
          console.log(`   🗑️  Eliminando duplicado: ${dest.id}`);
          
          // Eliminar datos relacionados
          await db.delete(destinationImages).where(eq(destinationImages.destinationId, dest.id));
          await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
          await db.delete(hotels).where(eq(hotels.destinationId, dest.id));
          await db.delete(inclusions).where(eq(inclusions.destinationId, dest.id));
          await db.delete(exclusions).where(eq(exclusions.destinationId, dest.id));
          
          // Eliminar el destino
          await db.delete(destinations).where(eq(destinations.id, dest.id));
          
          console.log(`   ✅ Eliminado`);
        }
      }
    }
    
    console.log("\n\n✅ Limpieza completada exitosamente");
    console.log("💡 Ahora puedes ejecutar: ALLOW_PROD_DATA_SYNC=true npx tsx scripts/sync-data.ts");
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

cleanupAllDuplicates();
