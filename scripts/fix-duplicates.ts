import { db } from "../server/db";
import { itineraryDays } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

async function fixDuplicates() {
  console.log("🔍 Buscando y eliminando días duplicados en itinerarios...\n");

  try {
    // Get all itinerary days grouped by destination and day number
    const allDays = await db.select().from(itineraryDays);
    
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
    
    // For each group, keep only the first one and delete the rest
    for (const [key, days] of groupedDays.entries()) {
      if (days.length > 1) {
        duplicatesFound += days.length - 1;
        console.log(`📌 Destino ${days[0].destinationId} - Día ${days[0].dayNumber}: ${days.length} entradas (eliminando ${days.length - 1})`);
        
        // Keep the first, delete the rest
        for (let i = 1; i < days.length; i++) {
          await db.delete(itineraryDays)
            .where(eq(itineraryDays.id, days[i].id));
          duplicatesRemoved++;
        }
      }
    }
    
    if (duplicatesFound === 0) {
      console.log("✅ No se encontraron duplicados\n");
    } else {
      console.log(`\n✅ Se eliminaron ${duplicatesRemoved} días duplicados\n`);
    }
    
    // Show summary by destination
    console.log("📊 Resumen por destino:");
    const summary = await db.select({
      destinationId: itineraryDays.destinationId,
      count: sql<number>`count(*)::int`,
    })
    .from(itineraryDays)
    .groupBy(itineraryDays.destinationId);
    
    for (const item of summary) {
      console.log(`   - ${item.destinationId}: ${item.count} días`);
    }
    
    console.log("\n✨ Proceso completado exitosamente");
    process.exit(0);
    
  } catch (error) {
    console.error("❌ ERROR:", error);
    process.exit(1);
  }
}

fixDuplicates();
