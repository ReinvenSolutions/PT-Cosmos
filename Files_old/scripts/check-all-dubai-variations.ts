import { db } from '../server/db';
import { destinations } from '../shared/schema';

async function checkAllDubaiVariations() {
  console.log('\n🔍 BUSCANDO TODAS LAS VARIACIONES DE DUBAI Y EMIRATOS\n');

  try {
    const allDestinations = await db.select().from(destinations);
    
    // Filtrar cualquier destino que tenga "dubai" o "emiratos" en el nombre
    const dubaiRelated = allDestinations.filter(d => 
      d.name.toLowerCase().includes('dubai') || 
      d.name.toLowerCase().includes('emiratos')
    );

    console.log(`📋 Destinos relacionados encontrados: ${dubaiRelated.length}\n`);

    dubaiRelated.forEach((dest, index) => {
      console.log(`${index + 1}. "${dest.name}"`);
      console.log(`   ID: ${dest.id}`);
      console.log(`   País: ${dest.country}`);
      console.log(`   isActive: ${dest.isActive ? '✅ ACTIVO' : '❌ INACTIVO'}`);
      console.log(`   displayOrder: ${dest.displayOrder}`);
      console.log(`   category: ${dest.category}`);
      console.log('');
    });

    // Buscar específicamente las variaciones exactas
    console.log('🔎 BÚSQUEDA ESPECÍFICA:\n');
    
    const exactSearch1 = allDestinations.find(d => d.name === 'DUBAI Y LOS EMIRATOS');
    const exactSearch2 = allDestinations.find(d => d.name === 'Dubai y Los Emiratos');
    const exactSearch3 = allDestinations.find(d => d.name === 'Dubai y los Emiratos');
    
    console.log('1. "DUBAI Y LOS EMIRATOS" (MAYÚSCULAS):', exactSearch1 ? `✅ EXISTE (${exactSearch1.isActive ? 'ACTIVO' : 'INACTIVO'})` : '❌ NO EXISTE');
    console.log('2. "Dubai y Los Emiratos" (Capitalizado):', exactSearch2 ? `✅ EXISTE (${exactSearch2.isActive ? 'ACTIVO' : 'INACTIVO'})` : '❌ NO EXISTE');
    console.log('3. "Dubai y los Emiratos" (Parcial):', exactSearch3 ? `✅ EXISTE (${exactSearch3.isActive ? 'ACTIVO' : 'INACTIVO'})` : '❌ NO EXISTE');

    console.log('\n✅ Verificación completa\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllDubaiVariations();
