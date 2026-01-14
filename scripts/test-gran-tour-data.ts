import { db } from "../server/db";
import { destinations, itineraryDays } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testGranTourData() {
  try {
    console.log("🔍 Probando carga de datos del Gran Tour de Europa...\n");
    
    const granTourId = '7f7b1902-dd9e-40d9-bf09-abbb53cc4143';
    
    // Simular lo que hace el endpoint
    const destination = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, granTourId))
      .limit(1);
    
    console.log("Destino:", destination[0]?.name);
    console.log("ID:", destination[0]?.id);
    
    const itinerary = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.destinationId, granTourId))
      .orderBy(itineraryDays.dayNumber);
    
    console.log(`\nItinerario: ${itinerary.length} días`);
    
    if (itinerary.length === 0) {
      console.log("❌ El destino NO tiene itinerario!");
    } else {
      console.log("✅ El destino tiene itinerario:");
      itinerary.forEach(day => {
        console.log(`   Día ${day.dayNumber}: ${day.title}`);
      });
    }
    
    // Verificar qué objeto se enviaría al PDF
    console.log("\n📦 Objeto que se enviaría al generador de PDF:");
    const pdfData = {
      id: destination[0]?.id,
      name: destination[0]?.name,
      itinerary: itinerary
    };
    
    console.log(JSON.stringify({
      id: pdfData.id,
      name: pdfData.name,
      itineraryCount: pdfData.itinerary.length,
      hasItinerary: pdfData.itinerary && pdfData.itinerary.length > 0
    }, null, 2));
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

testGranTourData();
