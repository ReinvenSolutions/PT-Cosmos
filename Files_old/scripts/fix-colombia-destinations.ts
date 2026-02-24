import 'dotenv/config';
import { db } from "../server/db";
import { 
  destinations, 
  itineraryDays, 
  hotels, 
  inclusions, 
  exclusions, 
  destinationImages 
} from "../shared/schema";
import { eq, inArray } from "drizzle-orm";
import { seedDestinations, seedItineraryDays, seedHotels, seedInclusions, seedExclusions } from "../shared/seed-data";

/**
 * Script para eliminar destinos con IDs inválidos y reinsertarlos con IDs correctos
 */

const oldIds = [
  'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
  'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
  'c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
  'd4e5f6g7-8h9i-0j1k-2l3m-4n5o6p7q8r9s'
];

const newIds = [
  'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
  'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a'
];

async function fixColombiaDestinations() {
  console.log("🔧 Corrigiendo destinos de Colombia con IDs inválidos...\n");
  
  // 1. Eliminar destinos antiguos (esto eliminará en cascada todas las relaciones)
  console.log("🗑️  Eliminando destinos con IDs inválidos...");
  for (const oldId of oldIds) {
    try {
      const [dest] = await db.select().from(destinations).where(eq(destinations.id, oldId));
      if (dest) {
        console.log(`   Eliminando: ${dest.name}`);
        await db.delete(destinations).where(eq(destinations.id, oldId));
      }
    } catch (error) {
      // Si no existe, no hay problema
      console.log(`   ID ${oldId} no encontrado, continuando...`);
    }
  }
  
  console.log("\n📥 Insertando destinos con IDs correctos...");
  
  // 2. Filtrar solo los destinos de Colombia que necesitamos reinsertar
  const colombiaDestinations = seedDestinations.filter(dest => 
    newIds.includes(dest.id)
  );
  
  for (const dest of colombiaDestinations) {
    try {
      console.log(`   Insertando: ${dest.name}`);
      await db.insert(destinations).values(dest);
      
      // Insertar itinerary days
      const itineraryForDest = seedItineraryDays.filter(it => it.destinationId === dest.id);
      if (itineraryForDest.length > 0) {
        await db.insert(itineraryDays).values(itineraryForDest);
        console.log(`      ✓ ${itineraryForDest.length} días de itinerario`);
      }
      
      // Insertar hotels
      const hotelsForDest = seedHotels.filter(h => h.destinationId === dest.id);
      if (hotelsForDest.length > 0) {
        await db.insert(hotels).values(hotelsForDest);
        console.log(`      ✓ ${hotelsForDest.length} hoteles`);
      }
      
      // Insertar inclusions
      const inclusionsForDest = seedInclusions.filter(inc => inc.destinationId === dest.id);
      if (inclusionsForDest.length > 0) {
        await db.insert(inclusions).values(inclusionsForDest);
        console.log(`      ✓ ${inclusionsForDest.length} inclusiones`);
      }
      
      // Insertar exclusions
      const exclusionsForDest = seedExclusions.filter(exc => exc.destinationId === dest.id);
      if (exclusionsForDest.length > 0) {
        await db.insert(exclusions).values(exclusionsForDest);
        console.log(`      ✓ ${exclusionsForDest.length} exclusiones`);
      }
      
    } catch (error: any) {
      console.error(`   ❌ Error insertando ${dest.name}:`, error.message);
    }
  }
  
  console.log("\n✅ Corrección completada\n");
  
  // Verificar
  console.log("🔍 Verificando destinos actualizados...\n");
  for (const newId of newIds) {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, newId));
    if (dest) {
      console.log(`✓ ${dest.name} - ID: ${dest.id}`);
    } else {
      console.log(`⚠️  No se encontró destino con ID: ${newId}`);
    }
  }
  
  process.exit(0);
}

fixColombiaDestinations().catch(error => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});
