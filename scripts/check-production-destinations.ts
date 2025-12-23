import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { or, eq } from "drizzle-orm";

async function checkProductionDestinations() {
  console.log("Verificando destinos en producción...\n");
  
  // Check Dubai y los Emiratos
  console.log("=== DUBAI Y LOS EMIRATOS ===");
  const dubaiEmiratosCount = await db.select().from(destinations)
    .where(eq(destinations.name, 'DUBAI Y LOS EMIRATOS'));
  
  if (dubaiEmiratosCount.length === 0) {
    console.log("❌ NO EXISTE en producción\n");
  } else {
    dubaiEmiratosCount.forEach(d => {
      console.log(`✅ Encontrado: ${d.name}`);
      console.log(`   ID: ${d.id}`);
      console.log(`   isActive: ${d.isActive}`);
      console.log(`   displayOrder: ${d.displayOrder}`);
      console.log(`   priceTiers: ${d.priceTiers?.length || 0} fechas\n`);
    });
  }
  
  // Check Colombia destinations
  console.log("=== DESTINOS DE COLOMBIA ===");
  const colombiaDestinations = await db.select().from(destinations)
    .where(eq(destinations.category, 'nacional'));
  
  if (colombiaDestinations.length === 0) {
    console.log("❌ NO HAY DESTINOS DE COLOMBIA en producción\n");
  } else {
    console.log(`Total: ${colombiaDestinations.length} destinos\n`);
    colombiaDestinations.forEach(d => {
      console.log(`${d.isActive ? '✅' : '❌'} ${d.name}`);
      console.log(`   ID: ${d.id}`);
      console.log(`   isActive: ${d.isActive}`);
      console.log(`   displayOrder: ${d.displayOrder}\n`);
    });
  }
  
  process.exit(0);
}

checkProductionDestinations();
