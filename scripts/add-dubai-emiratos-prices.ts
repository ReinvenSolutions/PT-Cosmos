import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addDubaiEmiratesPrices() {
  console.log("Agregando tarifas dinámicas a DUBAI Y LOS EMIRATOS...\n");

  try {
    const priceTiers = [];
    
    // Período 1: Del 5 de enero al 30 de abril 2026 - $1,080 USD
    let currentDate = new Date(2026, 0, 5); // 5 de enero
    const endDate1 = new Date(2026, 3, 30); // 30 de abril
    
    while (currentDate <= endDate1) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Excluir lunes (día 1)
      if (currentDate.getDay() !== 1) {
        priceTiers.push({
          endDate: dateStr,
          price: "1080.00"
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Período 2: Del 1 de mayo al 30 de septiembre 2026 - $820 USD
    currentDate = new Date(2026, 4, 1); // 1 de mayo
    const endDate2 = new Date(2026, 8, 30); // 30 de septiembre
    
    while (currentDate <= endDate2) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      // Excluir lunes (día 1)
      if (currentDate.getDay() !== 1) {
        priceTiers.push({
          endDate: dateStr,
          price: "820.00"
        });
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    console.log(`Generadas ${priceTiers.length} fechas con precios dinámicos:`);
    console.log(`  - Enero-Abril: ${priceTiers.filter(t => t.price === "1080.00").length} días a $1,080`);
    console.log(`  - Mayo-Septiembre: ${priceTiers.filter(t => t.price === "820.00").length} días a $820`);
    console.log(`  - Excluidos todos los lunes\n`);
    
    // Actualizar el destino
    const result = await db
      .update(destinations)
      .set({ 
        priceTiers,
        basePrice: "1080.00" // Precio base actualizado
      })
      .where(eq(destinations.name, "DUBAI Y LOS EMIRATOS"))
      .returning();
    
    if (result.length > 0) {
      console.log(`✅ DUBAI Y LOS EMIRATOS actualizado con precios dinámicos`);
      console.log(`   Total fechas: ${priceTiers.length}`);
      console.log(`   Precio base: $1,080 USD`);
      console.log(`   Rango: 05 Enero - 30 Septiembre 2026`);
    } else {
      console.log("❌ No se encontró el programa");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addDubaiEmiratesPrices();
