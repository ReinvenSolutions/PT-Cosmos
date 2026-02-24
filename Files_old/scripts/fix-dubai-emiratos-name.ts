import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixDubaiEmiratosName() {
  console.log("Actualizando nombre de DUBAI Y LOS EMIRATOS...\n");

  try {
    // 1. Actualizar el nombre a "Dubai y Los Emiratos"
    const updateResult = await db
      .update(destinations)
      .set({ 
        name: "Dubai y Los Emiratos",
        isActive: true,
        displayOrder: 3
      })
      .where(eq(destinations.name, "DUBAI Y LOS EMIRATOS"))
      .returning();

    if (updateResult.length > 0) {
      console.log("✅ Nombre actualizado: DUBAI Y LOS EMIRATOS → Dubai y Los Emiratos");
      console.log("✅ Estado: ACTIVO");
      console.log("✅ Orden de visualización: 3 (después de Dubai Maravilloso)");
      console.log("\nDetalles del destino:");
      console.log(`  - ID: ${updateResult[0].id}`);
      console.log(`  - Nombre: ${updateResult[0].name}`);
      console.log(`  - País: ${updateResult[0].country}`);
      console.log(`  - Duración: ${updateResult[0].duration} días / ${updateResult[0].nights} noches`);
      console.log(`  - Activo: ${updateResult[0].isActive}`);
      console.log(`  - Orden: ${updateResult[0].displayOrder}`);
    } else {
      console.log("⚠️ No se encontró el destino DUBAI Y LOS EMIRATOS");
      
      // Verificar si ya existe con el nombre nuevo
      const existing = await db
        .select()
        .from(destinations)
        .where(eq(destinations.name, "Dubai y Los Emiratos"))
        .limit(1);
      
      if (existing.length > 0) {
        console.log("\n✅ El destino ya existe con el nombre correcto:");
        console.log(`  - Nombre: ${existing[0].name}`);
        console.log(`  - Activo: ${existing[0].isActive}`);
        console.log(`  - Orden: ${existing[0].displayOrder}`);
        
        // Asegurar que esté activo y en el orden correcto
        if (!existing[0].isActive || existing[0].displayOrder !== 3) {
          await db
            .update(destinations)
            .set({ 
              isActive: true,
              displayOrder: 3
            })
            .where(eq(destinations.id, existing[0].id));
          console.log("\n✅ Estado actualizado a ACTIVO con orden 3");
        }
      }
    }

    console.log("\n✅ Proceso completado exitosamente");
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

fixDubaiEmiratosName();
