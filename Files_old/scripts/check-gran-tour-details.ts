import { db } from "../server/db";
import { destinations, itineraryDays } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkGranTourDetails() {
  try {
    // ID del Gran Tour
    const granTourId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    // Obtener el destino
    const [dest] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, granTourId));
    
    console.log("🔍 Destino:");
    console.log(`   Nombre: ${dest?.name}`);
    console.log(`   ID: ${dest?.id}`);
    console.log(`   Duración: ${dest?.duration} días / ${dest?.nights} noches`);
    
    // Obtener el itinerario
    const itinerary = await db
      .select()
      .from(itineraryDays)
      .where(eq(itineraryDays.destinationId, granTourId))
      .orderBy(itineraryDays.dayNumber);
    
    console.log(`\n📅 Itinerario (${itinerary.length} días):`);
    
    // Agrupar por número de día para detectar duplicados
    const dayGroups: { [key: number]: any[] } = {};
    itinerary.forEach(day => {
      if (!dayGroups[day.dayNumber]) {
        dayGroups[day.dayNumber] = [];
      }
      dayGroups[day.dayNumber].push(day);
    });
    
    // Mostrar los días
    Object.keys(dayGroups).sort((a, b) => Number(a) - Number(b)).forEach(dayNum => {
      const days = dayGroups[Number(dayNum)];
      if (days.length > 1) {
        console.log(`   ❌ Día ${dayNum}: DUPLICADO (${days.length} entradas)`);
        days.forEach((day, idx) => {
          console.log(`      ${idx + 1}. ${day.title} (ID: ${day.id})`);
        });
      } else {
        console.log(`   ✅ Día ${dayNum}: ${days[0].title}`);
      }
    });
    
    // Resumen
    console.log(`\n📊 Resumen:`);
    console.log(`   Total de registros: ${itinerary.length}`);
    console.log(`   Días únicos: ${Object.keys(dayGroups).length}`);
    console.log(`   Duplicados: ${itinerary.length - Object.keys(dayGroups).length}`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    process.exit(0);
  }
}

checkGranTourDetails();
