import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addTurquiaPriceTiers() {
  console.log("Agregando priceTiers a Turquía Esencial (todos los martes)...\n");

  try {
    // Generar fechas de todos los martes desde enero 2026 hasta diciembre 2026
    const priceTiers = [];
    const startDate = new Date('2026-01-06'); // Primer martes de 2026
    const endDate = new Date('2026-12-31');
    
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Verificar que sea martes (día 2 en JavaScript: 0=Domingo, 1=Lunes, 2=Martes)
      if (currentDate.getDay() === 2) {
        const dateStr = currentDate.toISOString().split('T')[0];
        priceTiers.push({
          endDate: dateStr,
          price: "710.00" // Precio base de Turquía Esencial
        });
      }
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Generados ${priceTiers.length} martes con precios\n`);
    
    // Mostrar algunos ejemplos
    console.log("Primeros 5 martes:");
    priceTiers.slice(0, 5).forEach(tier => {
      console.log(`  - ${tier.endDate}: $${tier.price}`);
    });
    console.log("...");
    console.log("Últimos 3 martes:");
    priceTiers.slice(-3).forEach(tier => {
      console.log(`  - ${tier.endDate}: $${tier.price}`);
    });
    
    // Actualizar Turquía Esencial
    const result = await db
      .update(destinations)
      .set({ priceTiers })
      .where(eq(destinations.name, "Turquía Esencial"))
      .returning();
    
    if (result.length > 0) {
      console.log(`\n✅ Turquía Esencial actualizada con ${priceTiers.length} fechas (todos los martes)`);
    } else {
      console.log("\n❌ No se encontró Turquía Esencial");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addTurquiaPriceTiers();
