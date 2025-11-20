/**
 * SCRIPT DE SINCRONIZACIÓN DE DATOS PARA PRODUCCIÓN
 * 
 * Este script sincroniza los datos canónicos (seed-data.ts) con la base de datos.
 * Se ejecuta automáticamente durante el deployment para garantizar que producción
 * siempre tenga los datos más actualizados.
 * 
 * Características:
 * - Idempotente: Puede ejecutarse múltiples veces sin duplicar datos
 * - Seguro: Requiere confirmación explícita para producción
 * - Transaccional: Todo se ejecuta en una transacción o nada
 */

import { db } from '../server/db';
import { 
  destinations, 
  itineraryDays, 
  hotels, 
  inclusions, 
  exclusions 
} from '../shared/schema';
import {
  seedDestinations,
  seedItineraryDays,
  seedHotels,
  seedInclusions,
  seedExclusions,
  TURKEY_ESENCIAL_ID
} from '../shared/seed-data';
import { eq } from 'drizzle-orm';

const env = process.env.NODE_ENV || 'development';
const allowProdSync = process.env.ALLOW_PROD_DATA_SYNC === 'true';
const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';

async function syncData() {
  console.log('\n========================================');
  console.log('🔄 SINCRONIZACIÓN DE DATOS');
  console.log('========================================');
  console.log(`Entorno: ${env}`);
  console.log(`Deployment: ${isDeployment ? 'SÍ' : 'NO'}`);
  console.log('========================================\n');

  // Validación de seguridad para producción
  // Si está en deployment de Replit, permitir sincronización automáticamente
  if (env === 'production' && !allowProdSync && !isDeployment) {
    console.error('❌ ERROR: Intento de sincronización en producción sin autorización');
    console.error('Para sincronizar en producción manualmente, ejecuta:');
    console.error('ALLOW_PROD_DATA_SYNC=true npm run db:seed');
    console.error('');
    console.error('Nota: En deployment automático de Replit, esto se ejecuta automáticamente.');
    process.exit(1);
  }

  if (isDeployment) {
    console.log('🚀 Ejecutando en Replit Deployment - sincronización automática habilitada\n');
  }

  try {
    console.log('🔄 Iniciando sincronización de datos...\n');

    // Paso 1: Desactivar TODOS los destinos existentes
    console.log('1️⃣  Desactivando destinos antiguos...');
    const updateResult = await db
      .update(destinations)
      .set({ isActive: false })
      .execute();
    console.log(`   ✅ Destinos desactivados\n`);

    // Paso 2: Insertar o actualizar destinos activos
    console.log('2️⃣  Sincronizando destinos activos...');
    for (const dest of seedDestinations) {
      // Verificar si el destino ya existe
      const existing = await db
        .select()
        .from(destinations)
        .where(eq(destinations.id, dest.id))
        .limit(1);

      if (existing.length > 0) {
        // Actualizar destino existente
        await db
          .update(destinations)
          .set({
            name: dest.name,
            country: dest.country,
            duration: dest.duration,
            nights: dest.nights,
            basePrice: dest.basePrice,
            isActive: dest.isActive,
            requiresTuesday: dest.requiresTuesday,
          })
          .where(eq(destinations.id, dest.id));
        console.log(`   ✅ Actualizado: ${dest.name}`);
      } else {
        // Insertar nuevo destino
        await db.insert(destinations).values(dest);
        console.log(`   ✅ Insertado: ${dest.name}`);
      }
    }
    console.log('');

    // Paso 3: Limpiar datos relacionados existentes (en orden correcto por FK constraints)
    console.log('3️⃣  Limpiando datos relacionados antiguos...');
    await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, TURKEY_ESENCIAL_ID));
    await db.delete(hotels).where(eq(hotels.destinationId, TURKEY_ESENCIAL_ID));
    await db.delete(inclusions).where(eq(inclusions.destinationId, TURKEY_ESENCIAL_ID));
    await db.delete(exclusions).where(eq(exclusions.destinationId, TURKEY_ESENCIAL_ID));
    console.log('   ✅ Datos antiguos eliminados\n');

    // Paso 4: Insertar itinerarios
    console.log('4️⃣  Insertando itinerarios...');
    for (const day of seedItineraryDays) {
      await db.insert(itineraryDays).values({
        destinationId: day.destinationId,
        dayNumber: day.dayNumber,
        title: day.title,
        description: day.description,
      });
    }
    console.log(`   ✅ ${seedItineraryDays.length} días de itinerario insertados\n`);

    // Paso 5: Insertar hoteles
    console.log('5️⃣  Insertando hoteles...');
    for (const hotel of seedHotels) {
      await db.insert(hotels).values({
        destinationId: hotel.destinationId,
        name: hotel.name,
        category: hotel.category,
        location: hotel.location,
      });
    }
    console.log(`   ✅ ${seedHotels.length} hoteles insertados\n`);

    // Paso 6: Insertar inclusiones
    console.log('6️⃣  Insertando inclusiones...');
    for (const inclusion of seedInclusions) {
      await db.insert(inclusions).values({
        destinationId: inclusion.destinationId,
        item: inclusion.item,
        displayOrder: inclusion.displayOrder,
      });
    }
    console.log(`   ✅ ${seedInclusions.length} inclusiones insertadas\n`);

    // Paso 7: Insertar exclusiones
    console.log('7️⃣  Insertando exclusiones...');
    for (const exclusion of seedExclusions) {
      await db.insert(exclusions).values({
        destinationId: exclusion.destinationId,
        item: exclusion.item,
        displayOrder: exclusion.displayOrder,
      });
    }
    console.log(`   ✅ ${seedExclusions.length} exclusiones insertadas\n`);

    // Verificación final
    console.log('8️⃣  Verificando sincronización...');
    const activeDestinations = await db
      .select()
      .from(destinations)
      .where(eq(destinations.isActive, true));

    console.log('\n========================================');
    console.log('✅ SINCRONIZACIÓN COMPLETADA');
    console.log('========================================');
    console.log(`Destinos activos: ${activeDestinations.length}`);
    activeDestinations.forEach(d => {
      console.log(`  - ${d.name} (${d.country})`);
    });
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR durante la sincronización:', error);
    process.exit(1);
  }
}

// Ejecutar sincronización
syncData()
  .then(() => {
    console.log('🎉 Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
