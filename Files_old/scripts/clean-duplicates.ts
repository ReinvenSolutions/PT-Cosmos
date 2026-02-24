/**
 * Script para limpiar destinos duplicados
 */

import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";
import { eq, or } from "drizzle-orm";

async function cleanDuplicates() {
  try {
    console.log('\n========================================');
    console.log('🧹 LIMPIEZA DE DESTINOS DUPLICADOS');
    console.log('========================================\n');

    const oldIds = [
      'e5f6g7h8-9i0j-1k2l-3m4n-5o6p7q8r9s0t', // Amazonas antiguo
      'f6g7h8i9-0j1k-2l3m-4n5o-6p7q8r9s0t1u'  // Santander antiguo
    ];

    console.log('Eliminando destinos antiguos con IDs inválidos...');
    
    for (const oldId of oldIds) {
      // Eliminar datos relacionados
      await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, oldId));
      await db.delete(hotels).where(eq(hotels.destinationId, oldId));
      await db.delete(inclusions).where(eq(inclusions.destinationId, oldId));
      await db.delete(exclusions).where(eq(exclusions.destinationId, oldId));
      
      // Eliminar destino
      await db.delete(destinations).where(eq(destinations.id, oldId));
      
      console.log(`   ✅ Eliminado: ${oldId}`);
    }

    console.log('\n========================================');
    console.log('✅ LIMPIEZA COMPLETADA');
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

cleanDuplicates();
