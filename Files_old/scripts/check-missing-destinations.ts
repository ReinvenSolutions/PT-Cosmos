import 'dotenv/config';
import { db } from '../server/db';
import { destinations } from '../shared/schema';
import { or, ilike, eq } from 'drizzle-orm';

async function checkMissingDestinations() {
  console.log('\n🔍 VERIFICANDO DESTINOS FALTANTES\n');

  try {
    // Buscar Tour Cusco Aventura
    const cuscoAventura = await db.query.destinations.findMany({
      where: or(
        ilike(destinations.name, '%Cusco Aventura%'),
        ilike(destinations.name, '%Tour Cusco Aventura%')
      ),
    });

    console.log('📋 TOUR CUSCO AVENTURA:');
    if (cuscoAventura.length === 0) {
      console.log('   ❌ NO ENCONTRADO - Necesita ser creado\n');
    } else {
      cuscoAventura.forEach(dest => {
        console.log(`   ✅ Encontrado: "${dest.name}"`);
        console.log(`      ID: ${dest.id}`);
        console.log(`      isActive: ${dest.isActive}`);
        console.log(`      basePrice: $${dest.basePrice}`);
        console.log(`      duration: ${dest.duration} días / ${dest.nights} noches\n`);
      });
    }

    // Buscar Dubai y Los Emiratos
    const dubaiEmiratos = await db.query.destinations.findMany({
      where: or(
        ilike(destinations.name, '%Dubai y Los Emiratos%'),
        ilike(destinations.name, '%Dubai%Emiratos%')
      ),
    });

    console.log('📋 DUBAI Y LOS EMIRATOS:');
    if (dubaiEmiratos.length === 0) {
      console.log('   ❌ NO ENCONTRADO - Necesita ser creado\n');
    } else {
      dubaiEmiratos.forEach(dest => {
        console.log(`   ✅ Encontrado: "${dest.name}"`);
        console.log(`      ID: ${dest.id}`);
        console.log(`      isActive: ${dest.isActive}`);
        console.log(`      basePrice: $${dest.basePrice}`);
        console.log(`      duration: ${dest.duration} días / ${dest.nights} noches\n`);
      });
    }

    // Listar todos los destinos activos
    const allActive = await db.select().from(destinations).where(eq(destinations.isActive, true));
    console.log(`📊 TOTAL DE DESTINOS ACTIVOS: ${allActive.length}\n`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkMissingDestinations();
