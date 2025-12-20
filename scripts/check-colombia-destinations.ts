import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkColombiaDestinations() {
  console.log("Verificando destinos nacionales (Colombia)...\n");
  
  const nacionalDestinations = await db.select().from(destinations)
    .where(eq(destinations.category, 'nacional'));
  
  console.log(`Total destinos nacionales: ${nacionalDestinations.length}\n`);
  
  if (nacionalDestinations.length === 0) {
    console.log("⚠️ NO HAY DESTINOS NACIONALES EN LA BASE DE DATOS");
  } else {
    nacionalDestinations.forEach(d => {
      console.log(`📍 ${d.name}`);
      console.log(`   - ID: ${d.id}`);
      console.log(`   - País: ${d.country}`);
      console.log(`   - Categoría: ${d.category}`);
      console.log(`   - isActive: ${d.isActive}`);
      console.log(`   - displayOrder: ${d.displayOrder}`);
      console.log(`   - basePrice: $${d.basePrice}`);
      console.log('');
    });
  }
  
  process.exit(0);
}

checkColombiaDestinations();
