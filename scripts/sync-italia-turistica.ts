import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { seedDestinations } from "../shared/seed-data";
import { eq } from "drizzle-orm";

async function syncItaliaTuristica() {
  console.log("🔄 Sincronizando Italia Turística - Euro Express...\n");

  try {
    // Buscar en seed-data
    const italiaTuristica = seedDestinations.find(d => 
      d.name === "Italia Turística - Euro Express"
    );

    if (!italiaTuristica) {
      console.log("❌ No se encontró Italia Turística en seed-data.ts");
      return;
    }

    console.log("📦 Datos encontrados en seed-data.ts:");
    console.log(`   Nombre: ${italiaTuristica.name}`);
    console.log(`   Duración: ${italiaTuristica.duration} días / ${italiaTuristica.nights} noches`);
    console.log(`   Días permitidos: ${italiaTuristica.allowedDays?.join(', ') || 'No especificado'}`);
    console.log(`   Tarifas: ${italiaTuristica.priceTiers?.length || 0} fechas configuradas\n`);

    // Verificar si existe en BD
    const [existing] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, italiaTuristica.id));

    if (existing) {
      console.log("♻️  Actualizando destino existente...");
      
      await db.update(destinations)
        .set({
          name: italiaTuristica.name,
          country: italiaTuristica.country,
          duration: italiaTuristica.duration,
          nights: italiaTuristica.nights,
          description: italiaTuristica.description,
          imageUrl: italiaTuristica.imageUrl,
          basePrice: italiaTuristica.basePrice,
          category: italiaTuristica.category,
          isPromotion: italiaTuristica.isPromotion,
          displayOrder: italiaTuristica.displayOrder,
          isActive: italiaTuristica.isActive,
          requiresTuesday: italiaTuristica.requiresTuesday,
          allowedDays: italiaTuristica.allowedDays,
          priceTiers: italiaTuristica.priceTiers,
        })
        .where(eq(destinations.id, italiaTuristica.id));
      
      console.log("✅ Destino actualizado correctamente");
    } else {
      console.log("➕ Insertando nuevo destino...");
      
      await db.insert(destinations).values({
        id: italiaTuristica.id,
        name: italiaTuristica.name,
        country: italiaTuristica.country,
        duration: italiaTuristica.duration,
        nights: italiaTuristica.nights,
        description: italiaTuristica.description,
        imageUrl: italiaTuristica.imageUrl,
        basePrice: italiaTuristica.basePrice,
        category: italiaTuristica.category,
        isPromotion: italiaTuristica.isPromotion,
        displayOrder: italiaTuristica.displayOrder,
        isActive: italiaTuristica.isActive,
        requiresTuesday: italiaTuristica.requiresTuesday,
        allowedDays: italiaTuristica.allowedDays,
        priceTiers: italiaTuristica.priceTiers,
      });
      
      console.log("✅ Destino insertado correctamente");
    }

    // Verificación final
    const [final] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, italiaTuristica.id));

    console.log("\n✨ Verificación final:");
    console.log(`   ID: ${final.id}`);
    console.log(`   Nombre: ${final.name}`);
    console.log(`   Duración: ${final.duration} días / ${final.nights} noches`);
    console.log(`   Días permitidos: ${final.allowedDays?.join(', ') || 'No especificado'}`);
    console.log(`   Tarifas configuradas: ${final.priceTiers?.length || 0}`);
    console.log(`   Activo: ${final.isActive}`);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

syncItaliaTuristica()
  .then(() => {
    console.log("\n✅ Sincronización completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
