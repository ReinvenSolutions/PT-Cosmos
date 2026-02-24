import { db } from '../server/db';
import { destinations } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function activateAllDestinations() {
  console.log('\n🔄 ACTIVANDO TODOS LOS DESTINOS...\n');

  try {
    // Obtener todos los destinos
    const allDestinations = await db.select().from(destinations);
    
    console.log(`Total de destinos encontrados: ${allDestinations.length}\n`);

    // Contar cuántos están inactivos
    const inactiveDestinations = allDestinations.filter(d => !d.isActive);
    
    if (inactiveDestinations.length === 0) {
      console.log('✅ Todos los destinos ya están activos.\n');
      process.exit(0);
    }

    console.log(`❌ Destinos inactivos encontrados: ${inactiveDestinations.length}\n`);
    
    inactiveDestinations.forEach(dest => {
      console.log(`  - ${dest.name} (${dest.country})`);
    });

    console.log('\n🔧 Activando destinos...\n');

    // Activar todos los destinos
    for (const dest of inactiveDestinations) {
      await db
        .update(destinations)
        .set({ isActive: true })
        .where(eq(destinations.id, dest.id));
      
      console.log(`  ✅ Activado: ${dest.name}`);
    }

    console.log('\n✅ TODOS LOS DESTINOS HAN SIDO ACTIVADOS EXITOSAMENTE\n');

    // Verificar
    const updatedDestinations = await db.select().from(destinations);
    const stillInactive = updatedDestinations.filter(d => !d.isActive);
    
    if (stillInactive.length === 0) {
      console.log('✅ Verificación: Todos los destinos están activos.\n');
    } else {
      console.log(`⚠️ Advertencia: Aún hay ${stillInactive.length} destinos inactivos.\n`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error al activar destinos:', error);
    process.exit(1);
  }
}

activateAllDestinations();
