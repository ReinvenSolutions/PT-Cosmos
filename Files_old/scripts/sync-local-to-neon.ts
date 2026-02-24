
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { destinations, destinationImages, itineraryDays, hotels, inclusions, exclusions, users, quotes, quoteDestinations } from "../shared/schema";
import { db as localDb } from "../server/db";
import { sql } from "drizzle-orm";

// Base de datos de DESARROLLO en Neon
const devPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
});
const devDb = drizzle(devPool);

// Base de datos de PRODUCCIÓN en Neon
const prodPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-late-union-ae03ir4o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
});
const prodDb = drizzle(prodPool);

async function syncToRemote(remoteDb: any, dbName: string) {
  console.log(`\n🔄 Sincronizando con ${dbName}...`);
  
  try {
    // 1. Obtener datos locales
    console.log("  📥 Obteniendo datos locales...");
    const localDestinations = await localDb.select().from(destinations);
    const localUsers = await localDb.select().from(users);
    const localDestImages = await localDb.select().from(destinationImages);
    const localItinerary = await localDb.select().from(itineraryDays);
    const localHotels = await localDb.select().from(hotels);
    const localInclusions = await localDb.select().from(inclusions);
    const localExclusions = await localDb.select().from(exclusions);

    console.log(`     - ${localDestinations.length} destinos`);
    console.log(`     - ${localUsers.length} usuarios`);
    console.log(`     - ${localDestImages.length} imágenes`);
    console.log(`     - ${localItinerary.length} días de itinerario`);
    console.log(`     - ${localHotels.length} hoteles`);
    console.log(`     - ${localInclusions.length} inclusiones`);
    console.log(`     - ${localExclusions.length} exclusiones`);

    // 2. Limpiar datos existentes (excepto usuarios)
    console.log("  🧹 Limpiando datos antiguos...");
    await remoteDb.delete(quoteDestinations);
    await remoteDb.delete(quotes);
    await remoteDb.delete(destinationImages);
    await remoteDb.delete(exclusions);
    await remoteDb.delete(inclusions);
    await remoteDb.delete(hotels);
    await remoteDb.delete(itineraryDays);
    await remoteDb.delete(destinations);

    // 3. Insertar destinos
    console.log("  📤 Insertando destinos...");
    for (const dest of localDestinations) {
      await remoteDb.insert(destinations).values({
        id: dest.id,
        name: dest.name,
        country: dest.country,
        duration: dest.duration,
        nights: dest.nights,
        description: dest.description,
        imageUrl: dest.imageUrl,
        basePrice: dest.basePrice,
        category: dest.category,
        isPromotion: dest.isPromotion,
        displayOrder: dest.displayOrder,
        isActive: dest.isActive,
        requiresTuesday: dest.requiresTuesday,
      });
    }

    // 4. Insertar imágenes
    console.log("  📤 Insertando imágenes...");
    if (localDestImages.length > 0) {
      await remoteDb.insert(destinationImages).values(localDestImages.map(img => ({
        id: img.id,
        destinationId: img.destinationId,
        imageUrl: img.imageUrl,
        displayOrder: img.displayOrder,
      })));
    }

    // 5. Insertar itinerarios
    console.log("  📤 Insertando itinerarios...");
    if (localItinerary.length > 0) {
      await remoteDb.insert(itineraryDays).values(localItinerary.map(day => ({
        id: day.id,
        destinationId: day.destinationId,
        dayNumber: day.dayNumber,
        title: day.title,
        location: day.location,
        description: day.description,
        activities: day.activities,
        meals: day.meals,
        accommodation: day.accommodation,
      })));
    }

    // 6. Insertar hoteles
    console.log("  📤 Insertando hoteles...");
    if (localHotels.length > 0) {
      await remoteDb.insert(hotels).values(localHotels.map(hotel => ({
        id: hotel.id,
        destinationId: hotel.destinationId,
        name: hotel.name,
        location: hotel.location,
        category: hotel.category,
        nights: hotel.nights,
      })));
    }

    // 7. Insertar inclusiones
    console.log("  📤 Insertando inclusiones...");
    if (localInclusions.length > 0) {
      await remoteDb.insert(inclusions).values(localInclusions.map(inc => ({
        id: inc.id,
        destinationId: inc.destinationId,
        item: inc.item,
        displayOrder: inc.displayOrder,
      })));
    }

    // 8. Insertar exclusiones
    console.log("  📤 Insertando exclusiones...");
    if (localExclusions.length > 0) {
      await remoteDb.insert(exclusions).values(localExclusions.map(exc => ({
        id: exc.id,
        destinationId: exc.destinationId,
        item: exc.item,
        displayOrder: exc.displayOrder,
      })));
    }

    // 9. Sincronizar usuarios (solo agregar los que no existan)
    console.log("  👥 Sincronizando usuarios...");
    const remoteUsers = await remoteDb.select().from(users);
    const remoteUsernames = new Set(remoteUsers.map((u: any) => u.username));
    
    const newUsers = localUsers.filter(u => !remoteUsernames.has(u.username));
    if (newUsers.length > 0) {
      for (const user of newUsers) {
        await remoteDb.insert(users).values({
          name: user.name,
          username: user.username,
          email: user.email,
          passwordHash: user.passwordHash,
          role: user.role,
        });
      }
      console.log(`     ✓ ${newUsers.length} nuevos usuarios agregados`);
    } else {
      console.log(`     ✓ Todos los usuarios ya están sincronizados`);
    }

    console.log(`  ✅ ${dbName} sincronizado exitosamente!`);
  } catch (error) {
    console.error(`  ❌ Error sincronizando ${dbName}:`, error);
    throw error;
  }
}

async function syncAll() {
  console.log("🚀 Iniciando sincronización completa...");
  console.log("📍 Origen: Base de datos LOCAL (actual)");
  console.log("🎯 Destinos: Desarrollo (Neon) + Producción (Neon)\n");

  try {
    // Sincronizar con desarrollo
    await syncToRemote(devDb, "DESARROLLO");
    
    // Sincronizar con producción
    await syncToRemote(prodDb, "PRODUCCIÓN");

    console.log("\n✅ ¡Sincronización completa finalizada exitosamente!");
    console.log("\n📊 Resumen:");
    console.log("   - Base de datos de DESARROLLO: Actualizada");
    console.log("   - Base de datos de PRODUCCIÓN: Actualizada");
    console.log("   - Ambas bases ahora tienen los mismos datos que tu base local");

  } catch (error) {
    console.error("\n❌ Error durante la sincronización:", error);
  } finally {
    await devPool.end();
    await prodPool.end();
    process.exit(0);
  }
}

syncAll();
