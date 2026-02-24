import 'dotenv/config';
import { db } from "../server/db";
import { 
  destinations, 
  itineraryDays, 
  hotels, 
  inclusions, 
  exclusions, 
  destinationImages,
  quoteDestinations 
} from "../shared/schema";
import { eq, sql } from "drizzle-orm";

/**
 * Script para corregir los IDs de destinos nacionales que no eran UUIDs válidos
 * Los IDs antiguos contenían letras g-s que no son válidas en formato UUID
 */

const idMapping = [
  {
    old: 'a1b2c3d4-5e6f-7g8h-9i0j-1k2l3m4n5o6p',
    new: 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    name: 'Plan Amazonas 5 Días - 4 Noches 2025'
  },
  {
    old: 'b2c3d4e5-6f7g-8h9i-0j1k-2l3m4n5o6p7q',
    new: 'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
    name: 'Aventura en Santander'
  },
  {
    old: 'c3d4e5f6-7g8h-9i0j-1k2l-3m4n5o6p7q8r',
    new: 'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    name: 'Guajira Cabo de la Vela y Punta Gallinas'
  },
  {
    old: 'd4e5f6g7-8h9i-0j1k-2l3m-4n5o6p7q8r9s',
    new: 'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
    name: 'Capurganá'
  }
];

async function fixDestinationIds() {
  console.log("🔧 Iniciando corrección de IDs de destinos...\n");
  
  for (const mapping of idMapping) {
    console.log(`\n📍 Procesando: ${mapping.name}`);
    console.log(`   Old ID: ${mapping.old}`);
    console.log(`   New ID: ${mapping.new}`);
    
    try {
      // PRIMERO: Deshabilitar temporalmente las restricciones de clave foránea
      await db.execute(sql`SET CONSTRAINTS ALL DEFERRED`);
      
      // 1. Actualizar la tabla destinations PRIMERO (tabla padre)
      const destUpdated = await db.execute(
        sql`UPDATE destinations SET id = ${mapping.new} WHERE id = ${mapping.old}`
      );
      console.log(`   ✓ Destination actualizado: ${destUpdated.rowCount || 0}`);
      
      // 2. Actualizar itinerary_days
      const itineraryUpdated = await db.execute(
        sql`UPDATE itinerary_days SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Itinerary days actualizados: ${itineraryUpdated.rowCount || 0}`);
      
      // 3. Actualizar hotels
      const hotelsUpdated = await db.execute(
        sql`UPDATE hotels SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Hotels actualizados: ${hotelsUpdated.rowCount || 0}`);
      
      // 4. Actualizar inclusions
      const inclusionsUpdated = await db.execute(
        sql`UPDATE inclusions SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Inclusions actualizadas: ${inclusionsUpdated.rowCount || 0}`);
      
      // 5. Actualizar exclusions
      const exclusionsUpdated = await db.execute(
        sql`UPDATE exclusions SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Exclusions actualizadas: ${exclusionsUpdated.rowCount || 0}`);
      
      // 6. Actualizar destination_images
      const imagesUpdated = await db.execute(
        sql`UPDATE destination_images SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Destination images actualizadas: ${imagesUpdated.rowCount || 0}`);
      
      // 7. Actualizar quote_destinations (tiene foreign key a destinations)
      const quoteDestsUpdated = await db.execute(
        sql`UPDATE quote_destinations SET destination_id = ${mapping.new} WHERE destination_id = ${mapping.old}`
      );
      console.log(`   ✓ Quote destinations actualizados: ${quoteDestsUpdated.rowCount || 0}`);
      
      console.log(`   ✅ ${mapping.name} actualizado exitosamente`);
      
    } catch (error: any) {
      console.error(`   ❌ Error actualizando ${mapping.name}:`, error.message);
      
      // Si el error es porque el nuevo ID ya existe, no es un problema
      if (error.code === '23505') {
        console.log(`   ℹ️  El destino ${mapping.name} ya tiene el ID correcto`);
      }
    }
  }
  
  console.log("\n✅ Corrección de IDs completada\n");
  
  // Verificar que los destinos tienen los IDs correctos
  console.log("🔍 Verificando destinos actualizados...\n");
  for (const mapping of idMapping) {
    const [dest] = await db.select()
      .from(destinations)
      .where(eq(destinations.id, mapping.new));
    
    if (dest) {
      console.log(`✓ ${dest.name} - ID: ${dest.id}`);
    } else {
      console.log(`⚠️  No se encontró destino con ID: ${mapping.new}`);
    }
  }
  
  process.exit(0);
}

fixDestinationIds().catch(error => {
  console.error("❌ Error fatal:", error);
  process.exit(1);
});
