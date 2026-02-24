import "dotenv/config";
import { db } from "../server/db";
import { itineraryDays, destinations } from "@shared/schema";
import { eq, sql } from "drizzle-orm";

async function fixDuplicates() {
  console.log("🔍 Buscando y eliminando días duplicados en itinerarios...\n");

  try {
    // Get all itinerary days grouped by destination and day number
    const allDays = await db.select().from(itineraryDays);
    
    // Get destination names for better logging
    const allDestinations = await db.select().from(destinations);
    const destMap = new Map(allDestinations.map(d => [d.id, d.name]));
    
    // Group by destinationId and dayNumber to find duplicates
    const groupedDays = new Map<string, typeof allDays>();
    
    for (const day of allDays) {
      const key = `${day.destinationId}-${day.dayNumber}`;
      if (!groupedDays.has(key)) {
        groupedDays.set(key, []);
      }
      groupedDays.get(key)!.push(day);
    }
    
    let duplicatesFound = 0;
    let duplicatesRemoved = 0;
    const duplicatesByDestination = new Map<string, number>();
    
    // For each group, keep only the first one and delete the rest
    for (const [key, days] of groupedDays.entries()) {
      if (days.length > 1) {
        duplicatesFound += days.length - 1;
        const destName = destMap.get(days[0].destinationId) || days[0].destinationId;
        console.log(`📌 ${destName} - Día ${days[0].dayNumber}: ${days.length} entradas (eliminando ${days.length - 1})`);
        
        // Track duplicates by destination
        if (!duplicatesByDestination.has(destName)) {
          duplicatesByDestination.set(destName, 0);
        }
        duplicatesByDestination.set(destName, duplicatesByDestination.get(destName)! + (days.length - 1));
        
        // Keep the first (oldest by ID or creation), delete the rest
        // Sort by ID to ensure consistent selection
        const sortedDays = [...days].sort((a, b) => a.id.localeCompare(b.id));
        const toKeep = sortedDays[0];
        
        for (let i = 1; i < sortedDays.length; i++) {
          await db.delete(itineraryDays)
            .where(eq(itineraryDays.id, sortedDays[i].id));
          duplicatesRemoved++;
        }
      }
    }
    
    if (duplicatesFound === 0) {
      console.log("✅ No se encontraron duplicados\n");
    } else {
      console.log(`\n✅ Se eliminaron ${duplicatesRemoved} días duplicados\n`);
      
      if (duplicatesByDestination.size > 0) {
        console.log("📊 Duplicados eliminados por destino:");
        for (const [destName, count] of duplicatesByDestination.entries()) {
          console.log(`   - ${destName}: ${count} duplicados eliminados`);
        }
        console.log();
      }
    }
    
    // Show summary by destination
    console.log("📊 Resumen final por destino:");
    const summary = await db.select({
      destinationId: itineraryDays.destinationId,
      count: sql<number>`count(*)::int`,
    })
    .from(itineraryDays)
    .groupBy(itineraryDays.destinationId);
    
    for (const item of summary) {
      const destName = destMap.get(item.destinationId) || item.destinationId;
      console.log(`   - ${destName}: ${item.count} días únicos`);
    }
    
    console.log("\n✨ Proceso completado exitosamente");
    console.log("\n💡 Nota: La función getItineraryDays() ahora elimina duplicados automáticamente");
    console.log("   para prevenir este problema en el futuro.\n");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

fixDuplicates();
