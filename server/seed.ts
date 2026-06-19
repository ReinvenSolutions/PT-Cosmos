import { db } from "./db";
import { users, destinations } from "@shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

export async function seedDatabaseIfEmpty() {
  try {
    console.log("🔍 Verificando estado de la base de datos...");

    // Verificar si ya hay destinos
    const existingDestinations = await db.select().from(destinations).limit(1);
    
    if (existingDestinations.length > 0) {
      console.log("✅ Base de datos ya poblada. Omitiendo seed.");
      return;
    }

    console.log("📊 Base de datos vacía detectada. Iniciando seed automático...");

    // PRIMERO: Importar datos desde el archivo SQL (incluye usuarios, destinos, etc)
    const sqlImportSuccess = await importSQLData();

    // DESPUÉS: Verificar y crear usuarios base que falten (backfill)
    if (sqlImportSuccess) {
      await seedBaseUsers();
      console.log("✅ Seed completado exitosamente!");
    } else {
      // Si falla el SQL, intentar crear al menos los usuarios base
      console.log("⚠️ SQL import falló. Creando usuarios base solamente...");
      await seedBaseUsers();
      console.log("⚠️ Seed parcial completado (solo usuarios).");
    }
    
  } catch (error) {
    console.error("❌ Error crítico durante el seed automático:", error);
    // No lanzar el error para que la aplicación pueda iniciar de todos modos
    console.log("⚠️ La aplicación continuará sin datos iniciales.");
  }
}

async function seedBaseUsers() {
  console.log("👤 Verificando usuarios base...");

  try {
    // Crear super admin si no existe
    const existingAdmin = await db.select().from(users).where(sql`${users.username} = 'admin'`).limit(1);
    
    if (existingAdmin.length === 0) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await db.insert(users).values({
        name: "Administrador",
        username: "admin",
        email: "admin@sistema.com",
        passwordHash: hashedPassword,
        role: "super_admin",
      });
      console.log("   ✓ Usuario admin creado");
    } else {
      console.log("   ✓ Usuario admin ya existe");
    }

    // Crear asesor de prueba si no existe
    const existingAdvisor = await db.select().from(users).where(sql`${users.username} = 'advisor1'`).limit(1);
    
    if (existingAdvisor.length === 0) {
      const advisorPassword = await bcrypt.hash("advisor123", 10);
      await db.insert(users).values({
        name: "Asesor de Prueba",
        username: "advisor1",
        email: "advisor1@sistema.com",
        passwordHash: advisorPassword,
        role: "agency",
      });
      console.log("   ✓ Usuario advisor1 creado");
    } else {
      console.log("   ✓ Usuario advisor1 ya existe");
    }
  } catch (error) {
    console.error("   ❌ Error creando usuarios base:", error);
  }
}

async function importSQLData(): Promise<boolean> {
  console.log("🌍 Importando datos desde archivo SQL...");

  try {
    // Leer el archivo SQL de exportación
    const sqlFilePath = join(process.cwd(), 'export-production-data.sql');
    const sqlContent = readFileSync(sqlFilePath, 'utf-8');

    // Ejecutar el SQL completo
    await db.execute(sql.raw(sqlContent));

    console.log("   ✓ Datos importados exitosamente");
    console.log("   📋 Incluye: 38 destinos con itinerarios, hoteles, inclusiones y exclusiones");
    return true;
  } catch (error: any) {
    // Si el archivo no existe o hay un error, reportar y retornar false
    if (error.code === 'ENOENT') {
      console.error("   ❌ Archivo export-production-data.sql no encontrado");
      console.log("   💡 Puedes importar datos manualmente desde el panel de base de datos");
    } else {
      console.error("   ❌ Error importando datos SQL:", error.message);
      if (error.stack) {
        console.error("   Stack:", error.stack);
      }
    }
    return false;
  }
}
