import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addDubaiPriceTiers() {
  console.log("Agregando priceTiers a Dubai (todos los días)...\n");

  try {
    // Dubai tiene rangos de precios:
    // Hasta 2026-04-30: $660
    // Desde 2026-05-01 hasta 2026-09-30: $560
    // Desde 2026-10-01 en adelante: $660
    
    const priceTiers = [];
    const startDate = new Date('2026-01-01');
    const endDate = new Date('2026-12-31');
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Determinar precio según el rango
      let price = "660.00"; // Precio por defecto
      
      if (currentDate >= new Date('2026-05-01') && currentDate <= new Date('2026-09-30')) {
        price = "560.00"; // Temporada baja (mayo-sept)
      }
      
      priceTiers.push({
        endDate: dateStr,
        price: price
      });
      
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Generados ${priceTiers.length} días con precios\n`);
    
    // Mostrar algunos ejemplos por mes
    console.log("Ejemplos de precios por temporada:");
    console.log("  Enero (temporada alta):", priceTiers.find(t => t.endDate.startsWith('2026-01'))?.price);
    console.log("  Abril (temporada alta):", priceTiers.find(t => t.endDate.startsWith('2026-04'))?.price);
    console.log("  Mayo (temporada baja):", priceTiers.find(t => t.endDate.startsWith('2026-05'))?.price);
    console.log("  Agosto (temporada baja):", priceTiers.find(t => t.endDate.startsWith('2026-08'))?.price);
    console.log("  Octubre (temporada alta):", priceTiers.find(t => t.endDate.startsWith('2026-10'))?.price);
    console.log("  Diciembre (temporada alta):", priceTiers.find(t => t.endDate.startsWith('2026-12'))?.price);
    
    // Actualizar Dubai
    const result = await db
      .update(destinations)
      .set({ priceTiers })
      .where(eq(destinations.name, "DUBAI Maravilloso"))
      .returning();
    
    if (result.length > 0) {
      console.log(`\n✅ Dubai Maravilloso actualizado con ${priceTiers.length} fechas (todos los días)`);
      console.log("   - Temporada alta (Ene-Abr, Oct-Dic): $660");
      console.log("   - Temporada baja (May-Sep): $560");
    } else {
      console.log("\n❌ No se encontró Dubai Maravilloso");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addDubaiPriceTiers();
