import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addTurquiaPriceTiers() {
  console.log("Agregando priceTiers a Turquía Esencial (martes con precio + lunes con vuelo)...\n");

  try {
    // Generar fechas de todos los martes desde enero 2026 hasta diciembre 2026
    const priceTiers = [];
    const startDate = new Date('2026-01-06'); // Primer martes de 2026
    const endDate = new Date('2026-12-31');
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Verificar que sea martes (día 2 en JavaScript: 0=Domingo, 1=Lunes, 2=Martes)
      if (currentDate.getDay() === 2) {
        // Agregar el lunes previo como día de vuelo desde Colombia
        const monday = new Date(currentDate);
        monday.setDate(monday.getDate() - 1);
        const mondayStr = monday.toISOString().split('T')[0];
        
        const tuesdayStr = currentDate.toISOString().split('T')[0];
        
        priceTiers.push({
          endDate: mondayStr,
          price: "710.00",
          isFlightDay: true,
          flightLabel: "🛫 COL"
        });
        
        // Agregar el martes como día de llegada directa con precio
        priceTiers.push({
          endDate: tuesdayStr,
          price: "710.00"
        });
      }
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Generados ${priceTiers.length / 2} martes con precios + ${priceTiers.length / 2} lunes con vuelos\n`);
    
    // Mostrar algunos ejemplos
    console.log("Primeros 3 pares (lunes vuelo + martes llegada):");
    for (let i = 0; i < 6 && i < priceTiers.length; i += 2) {
      console.log(`  Lunes: ${priceTiers[i].endDate} (${priceTiers[i].flightLabel})`);
      console.log(`  Martes: ${priceTiers[i + 1].endDate} ($${priceTiers[i + 1].price})`);
    }
    console.log("...");
    
    // Actualizar Turquía Esencial
    const result = await db
      .update(destinations)
      .set({ priceTiers })
      .where(eq(destinations.name, "Turquía Esencial"))
      .returning();
    
    if (result.length > 0) {
      console.log(`\n✅ Turquía Esencial actualizada con ${priceTiers.length} fechas (lunes + martes)`);
    } else {
      console.log("\n❌ No se encontró Turquía Esencial");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addTurquiaPriceTiers();
