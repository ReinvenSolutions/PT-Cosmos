import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixTurkeyOrder() {
  console.log("\n=== Actualizando orden de Turquía ===\n");
  
  // Actualizar Turquía Esencial a displayOrder = 1
  const turquia = await db
    .select()
    .from(destinations)
    .where(eq(destinations.name, "Turquía Esencial"))
    .limit(1);

  if (turquia.length === 0) {
    console.log("❌ Turquía Esencial no encontrada");
    process.exit(1);
  }

  await db
    .update(destinations)
    .set({ displayOrder: 1 })
    .where(eq(destinations.id, turquia[0].id));

  console.log("✅ Turquía Esencial actualizada a displayOrder = 1");
  
  // Actualizar el resto de destinos internacionales a displayOrder = 2
  await db
    .update(destinations)
    .set({ displayOrder: 2 })
    .where(eq(destinations.category, "internacional"));

  // Volver a poner Turquía en 1 (por si se sobrescribió)
  await db
    .update(destinations)
    .set({ displayOrder: 1 })
    .where(eq(destinations.id, turquia[0].id));

  console.log("✅ Resto de destinos internacionales actualizados a displayOrder = 2");
  
  // Verificar
  const updated = await db
    .select({
      name: destinations.name,
      displayOrder: destinations.displayOrder
    })
    .from(destinations)
    .where(eq(destinations.category, "internacional"))
    .orderBy(destinations.displayOrder, destinations.name);

  console.log("\n📋 Orden final:");
  updated.forEach((d, i) => {
    console.log(`  ${i + 1}. [Order: ${d.displayOrder}] ${d.name}`);
  });

  process.exit(0);
}

fixTurkeyOrder().catch(console.error);
