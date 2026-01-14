import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function applyUniqueConstraint() {
  try {
    console.log("🔍 Verificando si el constraint ya existe...");
    
    // Check if constraint already exists
    const checkConstraint = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'itinerary_days' 
      AND constraint_name = 'unique_destination_day'
    `);

    if (checkConstraint.rows.length > 0) {
      console.log("✅ El constraint 'unique_destination_day' ya existe. No se necesita aplicar.");
      return;
    }

    console.log("🧹 Limpiando duplicados existentes...");
    
    // Remove duplicates (keep the first occurrence based on id)
    const deleteDuplicates = await db.execute(sql`
      DELETE FROM itinerary_days
      WHERE id NOT IN (
        SELECT DISTINCT ON (destination_id, day_number) id
        FROM itinerary_days
        ORDER BY destination_id, day_number, id
      )
    `);
    
    console.log(`✅ Duplicados eliminados: ${deleteDuplicates.rowCount || 0} filas`);

    console.log("🔧 Agregando constraint único...");
    
    // Add unique constraint
    await db.execute(sql`
      ALTER TABLE itinerary_days
      ADD CONSTRAINT unique_destination_day UNIQUE (destination_id, day_number)
    `);
    
    console.log("✅ Constraint 'unique_destination_day' agregado exitosamente!");
  } catch (error: any) {
    if (error.code === '42P07') {
      // Constraint already exists
      console.log("ℹ️  El constraint ya existe. Todo está bien.");
    } else if (error.code === '23505') {
      // Unique constraint violation - there are still duplicates
      console.error("❌ Error: Aún existen duplicados en la base de datos.");
      console.error("   Por favor, ejecuta primero el script fix-duplicates.ts para limpiar los duplicados.");
      process.exit(1);
    } else {
      console.error("❌ Error aplicando constraint:", error.message);
      throw error;
    }
  }
}

applyUniqueConstraint()
  .then(() => {
    console.log("🎉 Proceso completado!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error fatal:", error);
    process.exit(1);
  });
