import { db } from '../server/db';
import { exclusions, destinations } from '../shared/schema';
import { eq, and, ilike, inArray } from 'drizzle-orm';

async function removeLimaCuscoFlightExclusion() {
  console.log('\n🔧 ELIMINANDO ÍTEM DE BOLETOS LIMA-CUSCO DE EXCLUSIONES\n');

  try {
    // Primero, obtener todos los destinos de Perú
    const peruDestinations = await db
      .select()
      .from(destinations)
      .where(eq(destinations.country, 'Perú'));

    console.log(`📋 Destinos de Perú encontrados: ${peruDestinations.length}\n`);

    const destinationIds = peruDestinations.map(d => d.id);

    // Buscar todas las exclusiones que contengan "LIMA - CUSCO - LIMA" o "Lima - Cusco - Lima"
    const exclusionsToDelete = await db
      .select()
      .from(exclusions)
      .where(
        and(
          inArray(exclusions.destinationId, destinationIds),
          ilike(exclusions.item, '%LIMA%CUSCO%LIMA%')
        )
      );

    console.log(`❌ Exclusiones encontradas para eliminar: ${exclusionsToDelete.length}\n`);

    if (exclusionsToDelete.length === 0) {
      console.log('✅ No hay exclusiones de boletos LIMA-CUSCO para eliminar.\n');
      process.exit(0);
    }

    // Mostrar qué se va a eliminar
    exclusionsToDelete.forEach((exc, index) => {
      const dest = peruDestinations.find(d => d.id === exc.destinationId);
      console.log(`${index + 1}. "${exc.item}"`);
      console.log(`   Destino: ${dest?.name}`);
      console.log('');
    });

    console.log('🗑️  Eliminando exclusiones...\n');

    // Eliminar todas las exclusiones encontradas
    for (const exc of exclusionsToDelete) {
      await db.delete(exclusions).where(eq(exclusions.id, exc.id));
      const dest = peruDestinations.find(d => d.id === exc.destinationId);
      console.log(`✅ Eliminado de: ${dest?.name}`);
    }

    console.log('\n✅ TODAS LAS EXCLUSIONES DE BOLETOS LIMA-CUSCO HAN SIDO ELIMINADAS\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al eliminar exclusiones:', error);
    process.exit(1);
  }
}

removeLimaCuscoFlightExclusion();
