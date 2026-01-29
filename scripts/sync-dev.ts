/**
 * Script para sincronizar datos canónicos en desarrollo
 * Ejecutar con: npx tsx scripts/sync-dev.ts
 */

import { db } from "../server/db";
import { 
  destinations, 
  itineraryDays, 
  hotels, 
  inclusions, 
  exclusions 
} from "@shared/schema";
import {
  seedDestinations,
  seedItineraryDays,
  seedHotels,
  seedInclusions,
  seedExclusions
} from "../shared/seed-data";
import { eq } from "drizzle-orm";

async function syncDevelopmentData() {
  try {
    console.log('\n========================================');
    console.log('🔄 SINCRONIZACIÓN DE DATOS EN DESARROLLO');
    console.log('========================================\n');

    // Sincronizar destinos
    console.log('1️⃣  Sincronizando destinos...');
    for (const dest of seedDestinations) {
      const existing = await db
        .select()
        .from(destinations)
        .where(eq(destinations.id, dest.id))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(destinations)
          .set({
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
          })
          .where(eq(destinations.id, dest.id));
        console.log(`   ✅ Actualizado: ${dest.name}`);
      } else {
        await db.insert(destinations).values(dest);
        console.log(`   ✅ Insertado: ${dest.name}`);
      }
    }
    console.log('');

    // Limpiar y reinsertar datos relacionados
    console.log('2️⃣  Actualizando itinerarios...');
    for (const destId of [...new Set(seedItineraryDays.map(d => d.destinationId))]) {
      await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destId));
    }
    for (const day of seedItineraryDays) {
      await db.insert(itineraryDays).values({
        destinationId: day.destinationId,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
      });
    }
    console.log(`   ✅ ${seedItineraryDays.length} días insertados\n`);

    console.log('3️⃣  Actualizando hoteles...');
    for (const destId of [...new Set(seedHotels.map(h => h.destinationId))]) {
      await db.delete(hotels).where(eq(hotels.destinationId, destId));
    }
    for (const hotel of seedHotels) {
      await db.insert(hotels).values({
        destinationId: hotel.destinationId,
        name: hotel.name,
        category: hotel.category,
        location: hotel.location,
      });
    }
    console.log(`   ✅ ${seedHotels.length} hoteles insertados\n`);

    console.log('4️⃣  Actualizando inclusiones...');
    for (const destId of [...new Set(seedInclusions.map(i => i.destinationId))]) {
      await db.delete(inclusions).where(eq(inclusions.destinationId, destId));
    }
    for (const inclusion of seedInclusions) {
      await db.insert(inclusions).values({
        destinationId: inclusion.destinationId,
        item: inclusion.item,
        displayOrder: inclusion.displayOrder,
      });
    }
    console.log(`   ✅ ${seedInclusions.length} inclusiones insertadas\n`);

    console.log('5️⃣  Actualizando exclusiones...');
    for (const destId of [...new Set(seedExclusions.map(e => e.destinationId))]) {
      await db.delete(exclusions).where(eq(exclusions.destinationId, destId));
    }
    for (const exclusion of seedExclusions) {
      await db.insert(exclusions).values({
        destinationId: exclusion.destinationId,
        item: exclusion.item,
        displayOrder: exclusion.displayOrder,
      });
    }
    console.log(`   ✅ ${seedExclusions.length} exclusiones insertadas\n`);

    console.log('========================================');
    console.log('✅ SINCRONIZACIÓN COMPLETADA');
    console.log('========================================');
    console.log(`Total de destinos: ${seedDestinations.length}`);
    console.log('\n📋 Destinos actualizados:');
    seedDestinations.slice(-3).forEach(d => {
      console.log(`  - ${d.name} (${d.country})`);
    });
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR durante la sincronización:', error);
    process.exit(1);
  }
}

syncDevelopmentData();
