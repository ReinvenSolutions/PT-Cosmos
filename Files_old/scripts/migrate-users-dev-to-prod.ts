
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";

// Base de datos de DESARROLLO
const devPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-blue-credit-aekag6rz-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
});
const devDb = drizzle(devPool);

// Base de datos de PRODUCCIÓN
const prodPool = new Pool({
  connectionString: "postgresql://neondb_owner:npg_mFCT5oPH6Ovr@ep-late-union-ae03ir4o-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require"
});
const prodDb = drizzle(prodPool);

async function migrateUsers() {
  try {
    console.log("🔄 Iniciando migración de usuarios de DEV a PROD...\n");

    // 1. Obtener usuarios de desarrollo
    console.log("📥 Obteniendo usuarios de DESARROLLO...");
    const devUsers = await devDb.select().from(users);
    console.log(`   ✓ Encontrados ${devUsers.length} usuarios en desarrollo\n`);

    // 2. Obtener usuarios existentes en producción
    console.log("📋 Verificando usuarios en PRODUCCIÓN...");
    const prodUsers = await prodDb.select().from(users);
    const prodUsernames = new Set(prodUsers.map(u => u.username));
    console.log(`   ✓ ${prodUsers.length} usuarios ya existen en producción\n`);

    // 3. Filtrar usuarios que no existen en producción
    const usersToMigrate = devUsers.filter(u => !prodUsernames.has(u.username));
    
    if (usersToMigrate.length === 0) {
      console.log("✅ Todos los usuarios ya están sincronizados. No hay nada que migrar.");
      await devPool.end();
      await prodPool.end();
      process.exit(0);
    }

    console.log(`🚀 Migrando ${usersToMigrate.length} nuevos usuarios:\n`);

    // 4. Migrar cada usuario
    for (const user of usersToMigrate) {
      console.log(`   → ${user.username} (${user.name}) - ${user.role}`);
      
      await prodDb.insert(users).values({
        name: user.name,
        username: user.username,
        email: user.email,
        passwordHash: user.passwordHash, // Usar el hash existente
        role: user.role,
      });
    }

    console.log("\n✅ Migración completada exitosamente!");
    console.log("\n📊 Resumen:");
    console.log(`   - Usuarios en desarrollo: ${devUsers.length}`);
    console.log(`   - Usuarios en producción (antes): ${prodUsers.length}`);
    console.log(`   - Usuarios migrados: ${usersToMigrate.length}`);
    console.log(`   - Total en producción (ahora): ${prodUsers.length + usersToMigrate.length}`);

    await devPool.end();
    await prodPool.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error durante la migración:", error);
    await devPool.end();
    await prodPool.end();
    process.exit(1);
  }
}

migrateUsers();
