import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkPriceTiers() {
  console.log("Verificando PriceTiers en todos los destinos...\n");

  try {
    const allDestinations = await db.select().from(destinations).where(eq(destinations.isActive, true));
    
    console.log(`Total de destinos activos: ${allDestinations.length}\n`);
    
    const withPriceTiers = allDestinations.filter(d => d.priceTiers && d.priceTiers.length > 0);
    const withoutPriceTiers = allDestinations.filter(d => !d.priceTiers || d.priceTiers.length === 0);
    
    console.log(`✅ Destinos CON priceTiers (${withPriceTiers.length}):`);
    withPriceTiers.forEach(d => {
      console.log(`  - ${d.name} (${d.priceTiers?.length} fechas)`);
    });
    
    console.log(`\n❌ Destinos SIN priceTiers (${withoutPriceTiers.length}):`);
    withoutPriceTiers.forEach(d => {
      console.log(`  - ${d.name} (${d.country})`);
    });
    
    // Mostrar ejemplo de priceTiers para verificar estructura
    if (withPriceTiers.length > 0) {
      const example = withPriceTiers[0];
      console.log(`\n📋 Ejemplo de estructura priceTiers (${example.name}):`);
      console.log(JSON.stringify(example.priceTiers?.slice(0, 3), null, 2));
    }
    
  } catch (error) {
    console.error("Error al verificar priceTiers:", error);
  }
  
  process.exit(0);
}

checkPriceTiers();
