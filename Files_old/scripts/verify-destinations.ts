/**
 * Script para verificar el estado de los destinos
 */

import { db } from "../server/db";
import { destinations } from "@shared/schema";
import { eq } from "drizzle-orm";

async function verifyDestinations() {
  try {
    console.log('\n========================================');
    console.log('📋 VERIFICACIÓN DE DESTINOS');
    console.log('========================================\n');

    // Obtener todos los destinos de Colombia
    const colombiaDestinations = await db
      .select()
      .from(destinations)
      .where(eq(destinations.country, 'Colombia'));

    console.log('Destinos de Colombia:');
    console.log('----------------------------------------');
    
    colombiaDestinations.forEach(dest => {
      const status = dest.isActive ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(`${status} | ${dest.name}`);
      console.log(`   ID: ${dest.id}`);
      console.log(`   Orden: ${dest.displayOrder}`);
      console.log(`   Imagen: ${dest.imageUrl}`);
      console.log('');
    });

    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ ERROR:', error);
    process.exit(1);
  }
}

verifyDestinations();
