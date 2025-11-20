/**
 * SINCRONIZACIÓN DE DATOS CANÓNICOS
 * 
 * Este módulo sincroniza los datos canónicos (shared/seed-data.ts) con la base de datos
 * cada vez que la aplicación se inicia en producción o deployment.
 * 
 * A diferencia del seed tradicional que solo se ejecuta si la DB está vacía,
 * este sistema SIEMPRE sincroniza los datos canónicos para garantizar que producción
 * esté actualizada con los últimos cambios.
 */

import { db } from "./db";
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
  seedExclusions,
  TURKEY_ESENCIAL_ID
} from "../shared/seed-data";
import { eq } from "drizzle-orm";

const isDeployment = process.env.REPLIT_DEPLOYMENT === '1';
const isProduction = process.env.NODE_ENV === 'production';

export async function syncCanonicalData() {
  // Solo ejecutar en producción o deployment
  if (!isProduction && !isDeployment) {
    console.log("🔄 Sincronización de datos canónicos omitida (no es producción)");
    return;
  }

  try {
    console.log('\n========================================');
    console.log('🔄 SINCRONIZACIÓN DE DATOS CANÓNICOS');
    console.log('========================================');
    console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Deployment: ${isDeployment ? 'SÍ' : 'NO'}`);
    console.log('========================================\n');

    // Paso 0: Verificar y agregar campo TRM si no existe
    console.log('0️⃣  Verificando esquema de base de datos...');
    try {
      await db.execute(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'quotes' AND column_name = 'trm'
          ) THEN
            ALTER TABLE quotes ADD COLUMN trm NUMERIC(10, 2);
            RAISE NOTICE 'Campo TRM agregado a la tabla quotes';
          ELSE
            RAISE NOTICE 'Campo TRM ya existe en la tabla quotes';
          END IF;
        END $$;
      `);
      console.log('   ✅ Esquema verificado y actualizado\n');
    } catch (schemaError) {
      console.error('   ⚠️  Error verificando esquema:', schemaError);
      console.log('   ℹ️  Continuando con la sincronización...\n');
    }

    // Paso 1: Desactivar TODOS los destinos existentes
    console.log('1️⃣  Desactivando destinos antiguos...');
    await db
      .update(destinations)
      .set({ isActive: false })
      .execute();
    console.log('   ✅ Destinos desactivados\n');

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

    // Paso 3: Limpiar datos relacionados existentes
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
    console.error('⚠️  La aplicación continuará, pero es posible que los datos no estén actualizados.');
    // No lanzar el error para que la aplicación pueda iniciar de todos modos
  }
}
