import { db } from '../server/db';
import { destinations } from '../shared/schema';
import { or, ilike } from 'drizzle-orm';

async function checkDubaiStatus() {
  console.log('\n🔍 VERIFICANDO ESTADO DE DUBAI Y LOS EMIRATOS\n');

  try {
    // Buscar todos los destinos con "Dubai" o "Emiratos"
    const dubaiPlans = await db
      .select()
      .from(destinations)
      .where(
        or(
          ilike(destinations.name, '%Dubai%'),
          ilike(destinations.name, '%Emiratos%')
        )
      );

    console.log(`📋 Destinos encontrados: ${dubaiPlans.length}\n`);

    dubaiPlans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.name}`);
      console.log(`   ID: ${plan.id}`);
      console.log(`   País: ${plan.country}`);
      console.log(`   isActive: ${plan.isActive ? '✅ ACTIVO' : '❌ INACTIVO'}`);
      console.log(`   displayOrder: ${plan.displayOrder}`);
      console.log(`   category: ${plan.category}`);
      console.log(`   duration: ${plan.duration}`);
      console.log(`   nights: ${plan.nights}`);
      console.log(`   basePrice: ${plan.basePrice}`);
      console.log(`   imageUrl: ${plan.imageUrl ? 'Sí' : 'No'}`);
      console.log('');
    });

    console.log('✅ Verificación completa\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDubaiStatus();
