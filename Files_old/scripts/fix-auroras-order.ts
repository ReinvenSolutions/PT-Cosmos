import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq, or, like } from "drizzle-orm";

async function fixAurorasOrder() {
  console.log("Corrigiendo orden de Auroras Boreales...\n");

  try {
    // Buscar "Auroras boreales" con diferentes variaciones
    const auroras = await db
      .select()
      .from(destinations)
      .where(like(destinations.name, '%Auroras%'));

    console.log("Destinos encontrados:\n");
    auroras.forEach(dest => {
      console.log(`- [${dest.displayOrder}] ${dest.name}`);
    });

    if (auroras.length > 0) {
      const aurorasName = auroras[0].name;
      
      // Actualizar a orden 4
      const result = await db
        .update(destinations)
        .set({ displayOrder: 4 })
        .where(eq(destinations.name, aurorasName))
        .returning();

      if (result.length > 0) {
        console.log(`\n✅ Orden actualizado: ${aurorasName} → 4`);
      }
    }

    console.log("\n✅ Proceso completado");
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

fixAurorasOrder();
