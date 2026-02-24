import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateTurquiaFlightDays() {
  console.log("Actualizando Turquía Esencial con días de vuelo desde Colombia...\n");

  try {
    const priceTiers = [];
    // Usar fechas locales desde el inicio
    const startDate = new Date(2025, 11, 1); // Mes 11 = diciembre (0-indexed)
    const endDate = new Date(2026, 11, 31); // Mes 11 = diciembre 2026
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Usar getDay() directamente en la fecha local
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Crear fecha local para verificar el día de la semana correctamente
      const localDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
      const dayOfWeek = localDate.getDay();
      
      // Martes (día 2): Día de vuelo desde Colombia (🛫 COL)
      if (dayOfWeek === 2) {
        priceTiers.push({
          endDate: dateStr,
          price: "710.00",
          isFlightDay: true,
          flightLabel: "🛫 COL"
        });
      }
      
      // Miércoles (día 3): Día de llegada directa (precio normal)
      if (dayOfWeek === 3) {
        priceTiers.push({
          endDate: dateStr,
          price: "710.00"
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    const tuesdaysCount = priceTiers.filter(t => t.isFlightDay).length;
    const wednesdaysCount = priceTiers.filter(t => !t.isFlightDay).length;
    
    console.log(`Generadas ${priceTiers.length} fechas disponibles:`);
    console.log(`  - ${tuesdaysCount} martes (🛫 COL - Vuelo desde Colombia, 11 días)`);
    console.log(`  - ${wednesdaysCount} miércoles (Llegada directa, 10 días)\n`);
    
    // Mostrar ejemplos
    console.log("Primeros días de enero 2026:");
    priceTiers.slice(0, 8).forEach(tier => {
      const date = new Date(tier.endDate);
      const dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
      const label = tier.isFlightDay ? "🛫 COL" : `$${tier.price}`;
      console.log(`  ${tier.endDate} (${dayName}): ${label}`);
    });
    
    // Actualizar Turquía Esencial
    const result = await db
      .update(destinations)
      .set({ priceTiers })
      .where(eq(destinations.name, "Turquía Esencial"))
      .returning();
    
    if (result.length > 0) {
      console.log(`\n✅ Turquía Esencial actualizada con ${priceTiers.length} fechas`);
      console.log(`   Martes: Vuelo desde Colombia (🛫 COL) - Plan de 11 días`);
      console.log(`   Miércoles: Llegada directa - Plan de 10 días`);
    } else {
      console.log("\n❌ No se encontró Turquía Esencial");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

updateTurquiaFlightDays();
