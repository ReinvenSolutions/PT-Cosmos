import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkDestinationsOrder() {
  console.log("\n=== Verificando destinos activos ===\n");
  
  const dests = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      country: destinations.country,
      category: destinations.category,
      displayOrder: destinations.displayOrder,
      imageUrl: destinations.imageUrl,
      isActive: destinations.isActive,
    })
    .from(destinations)
    .where(eq(destinations.isActive, true))
    .orderBy(destinations.displayOrder, destinations.name);

  console.log(`Total destinos activos: ${dests.length}\n`);
  
  // Agrupar por categoría
  const internacional = dests.filter(d => d.category === "internacional");
  const nacional = dests.filter(d => d.category === "nacional");
  
  console.log("📌 DESTINOS INTERNACIONALES:");
  internacional.forEach((d, i) => {
    const imageStatus = d.imageUrl ? "✅" : "❌";
    console.log(`  ${i + 1}. [Order: ${d.displayOrder}] ${d.name} (${d.country}) ${imageStatus} ${d.imageUrl || "SIN IMAGEN"}`);
  });
  
  console.log("\n📌 DESTINOS NACIONALES:");
  nacional.forEach((d, i) => {
    const imageStatus = d.imageUrl ? "✅" : "❌";
    console.log(`  ${i + 1}. [Order: ${d.displayOrder}] ${d.name} (${d.country}) ${imageStatus} ${d.imageUrl || "SIN IMAGEN"}`);
  });
  
  // Verificar específicamente Turquía
  const turquia = dests.find(d => d.name === "Turquía Esencial");
  if (turquia) {
    console.log(`\n🔍 TURQUÍA ESENCIAL:`);
    console.log(`   Display Order: ${turquia.displayOrder}`);
    console.log(`   Image URL: ${turquia.imageUrl || "SIN IMAGEN"}`);
    console.log(`   Debería estar primero en internacionales: ${turquia.displayOrder === 1 ? "✅ SÍ" : "❌ NO"}`);
  } else {
    console.log(`\n❌ TURQUÍA ESENCIAL NO ENCONTRADA`);
  }
  
  // Verificar destinos sin imagen
  const sinImagen = dests.filter(d => !d.imageUrl);
  if (sinImagen.length > 0) {
    console.log(`\n⚠️  DESTINOS SIN IMAGEN (${sinImagen.length}):`);
    sinImagen.forEach(d => {
      console.log(`   - ${d.name} (${d.country})`);
    });
  }
  
  process.exit(0);
}

checkDestinationsOrder().catch(console.error);
