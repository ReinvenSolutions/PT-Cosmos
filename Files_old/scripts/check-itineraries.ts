import { db } from "../server/db";
import { destinations, itineraryDays } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkItineraries() {
  try {
    console.log("🔍 Verificando itinerarios en la base de datos...\n");

    // Obtener todos los destinos activos
    const allDestinations = await db
      .select()
      .from(destinations)
      .where(eq(destinations.isActive, true));

    console.log(`Total de destinos activos: ${allDestinations.length}\n`);

    // Verificar cada destino
    for (const dest of allDestinations) {
      const itinerary = await db
        .select()
        .from(itineraryDays)
        .where(eq(itineraryDays.destinationId, dest.id));

      const status = itinerary.length > 0 ? "✅" : "❌";
      console.log(`${status} ${dest.name} (${dest.country}): ${itinerary.length} días de itinerario`);

      if (itinerary.length === 0) {
        console.log(`   ⚠️  Este destino NO tiene itinerario!`);
      }
    }

    console.log("\n🔍 Destinos sin itinerario:");
    const withoutItinerary = [];
    for (const dest of allDestinations) {
      const itinerary = await db
        .select()
        .from(itineraryDays)
        .where(eq(itineraryDays.destinationId, dest.id));

      if (itinerary.length === 0) {
        withoutItinerary.push(dest);
      }
    }

    if (withoutItinerary.length > 0) {
      console.log("\nDestinos sin itinerario:");
      withoutItinerary.forEach(dest => {
        console.log(`  - ${dest.name} (${dest.country}) - ID: ${dest.id}`);
      });
    } else {
      console.log("  ✅ Todos los destinos tienen itinerario");
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkItineraries();
