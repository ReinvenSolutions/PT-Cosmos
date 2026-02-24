import 'dotenv/config';
import { db } from '../server/db';
import { destinations } from '../shared/schema';
import { or, ilike, eq } from 'drizzle-orm';

async function activateMissingDestinations() {
  console.log('\n🔧 ACTIVANDO DESTINOS FALTANTES\n');

  try {
    // Buscar Tour Cusco Aventura
    const cuscoAventura = await db.query.destinations.findMany({
      where: or(
        ilike(destinations.name, '%Cusco Aventura%'),
        ilike(destinations.name, '%Tour Cusco Aventura%')
      ),
    });

    // Buscar Dubai y Los Emiratos
    const dubaiEmiratos = await db.query.destinations.findMany({
      where: or(
        ilike(destinations.name, '%Dubai y Los Emiratos%'),
        ilike(destinations.name, '%Dubai%Emiratos%')
      ),
    });

    const toActivate = [...cuscoAventura, ...dubaiEmiratos].filter(d => !d.isActive);

    if (toActivate.length === 0) {
      console.log('✅ Todos los destinos ya están activos.\n');
      process.exit(0);
    }

    console.log(`📋 Destinos a activar: ${toActivate.length}\n`);

    for (const dest of toActivate) {
      console.log(`🔧 Activando: "${dest.name}"`);
      console.log(`   ID: ${dest.id}`);
      console.log(`   País: ${dest.country}`);
      console.log(`   Precio: $${dest.basePrice}`);
      
      await db.update(destinations)
        .set({ isActive: true })
        .where(eq(destinations.id, dest.id));
      
      console.log(`   ✅ ACTIVADO\n`);
    }

    console.log('✅ TODOS LOS DESTINOS HAN SIDO ACTIVADOS EXITOSAMENTE\n');

    // Verificación final
    const finalCheck = await db.query.destinations.findMany({
      where: or(
        ilike(destinations.name, '%Cusco Aventura%'),
        ilike(destinations.name, '%Tour Cusco Aventura%'),
        ilike(destinations.name, '%Dubai y Los Emiratos%'),
        ilike(destinations.name, '%Dubai%Emiratos%')
      ),
    });

    console.log('🔍 VERIFICACIÓN FINAL:\n');
    finalCheck.forEach(dest => {
      const status = dest.isActive ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(`   ${status} - "${dest.name}"`);
    });
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

activateMissingDestinations();
