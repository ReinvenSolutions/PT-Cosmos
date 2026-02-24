import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";
import { seedDestinations } from "../shared/seed-data";

async function syncGranTourEuropa() {
  console.log("🔄 Sincronizando Gran Tour de Europa con la base de datos...\n");

  try {
    // Buscar el Gran Tour de Europa en seed-data
    const granTourData = seedDestinations.find(d => d.id === 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc');
    
    if (!granTourData) {
      console.log("❌ No se encontró Gran Tour de Europa en seed-data.ts");
      return;
    }
    
    console.log("📦 Datos encontrados en seed-data.ts:");
    console.log(`   Nombre: ${granTourData.name}`);
    console.log(`   Duración: ${granTourData.duration} días / ${granTourData.nights} noches`);
    console.log(`   Días permitidos: ${granTourData.allowedDays}`);
    
    // Verificar si ya existe en la base de datos
    const existing = await db.select()
      .from(destinations)
      .where(eq(destinations.id, granTourData.id));
    
    if (existing.length > 0) {
      // Actualizar
      console.log("\n🔄 Actualizando destino existente...");
      await db.update(destinations)
        .set({
          name: granTourData.name,
          country: granTourData.country,
          duration: granTourData.duration,
          nights: granTourData.nights,
          description: granTourData.description,
          imageUrl: granTourData.imageUrl,
          basePrice: granTourData.basePrice,
          category: granTourData.category,
          isPromotion: granTourData.isPromotion,
          displayOrder: granTourData.displayOrder,
          isActive: granTourData.isActive,
          requiresTuesday: granTourData.requiresTuesday,
          allowedDays: granTourData.allowedDays,
          priceTiers: granTourData.priceTiers as any
        })
        .where(eq(destinations.id, granTourData.id));
      
      console.log("✅ Destino actualizado correctamente");
    } else {
      // Insertar
      console.log("\n➕ Insertando nuevo destino...");
      await db.insert(destinations).values({
        id: granTourData.id,
        name: granTourData.name,
        country: granTourData.country,
        duration: granTourData.duration,
        nights: granTourData.nights,
        description: granTourData.description,
        imageUrl: granTourData.imageUrl,
        basePrice: granTourData.basePrice,
        category: granTourData.category,
        isPromotion: granTourData.isPromotion,
        displayOrder: granTourData.displayOrder,
        isActive: granTourData.isActive,
        requiresTuesday: granTourData.requiresTuesday,
        allowedDays: granTourData.allowedDays,
        priceTiers: granTourData.priceTiers as any
      });
      
      console.log("✅ Destino insertado correctamente");
    }
    
    // Verificar el resultado final
    const [final] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, granTourData.id));
    
    console.log("\n✨ Verificación final:");
    console.log(`   ID: ${final.id}`);
    console.log(`   Nombre: ${final.name}`);
    console.log(`   Duración: ${final.duration} días / ${final.nights} noches`);
    console.log(`   Días permitidos: ${final.allowedDays}`);
    console.log(`   Activo: ${final.isActive}`);
    
  } catch (error) {
    console.error("❌ Error sincronizando:", error);
    throw error;
  }
}

syncGranTourEuropa()
  .then(() => {
    console.log("\n✅ Sincronización completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
