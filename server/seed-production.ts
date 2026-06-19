import { db } from "./db";
import { users, clients, destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

export async function seedProductionDatabase() {
  console.log("🌱 Iniciando seed de base de datos de producción...");

  try {
    // Verificar si ya hay destinos
    const existingDestinations = await db.select().from(destinations).limit(1);
    
    if (existingDestinations.length > 0) {
      console.log("✓ La base de datos ya tiene datos. Omitiendo seed.");
      return;
    }

    console.log("📊 Base de datos vacía. Poblando con datos iniciales...");

    // 1. Crear usuario super admin
    console.log("👤 Creando usuario super admin...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    
    await db.insert(users).values({
      name: "Administrador",
      username: "admin",
      email: "admin@sistema.com",
      passwordHash: hashedPassword,
      role: "super_admin",
    }).onConflictDoNothing();

    // 2. Crear usuario asesor de prueba
    console.log("👤 Creando usuario asesor de prueba...");
    const advisorPassword = await bcrypt.hash("advisor123", 10);
    
    await db.insert(users).values({
      name: "Asesor de Prueba",
      username: "advisor1",
      email: "advisor@sistema.com",
      passwordHash: advisorPassword,
      role: "agency",
    }).onConflictDoNothing();

    // 3. Ejecutar el script SQL completo para poblar destinos
    console.log("🌍 Importando destinos desde archivo SQL...");
    
    // Leer y ejecutar el archivo de exportación
    const fs = await import('fs/promises');
    const sqlContent = await fs.readFile('export-production-data.sql', 'utf-8');
    
    // Ejecutar el SQL
    await db.execute(sql.raw(sqlContent));

    console.log("✅ Seed de base de datos completado exitosamente!");
    console.log("📋 Datos importados:");
    console.log("   - Usuarios: 2 (admin, advisor1)");
    console.log("   - Destinos: 38 con todos sus detalles");
    console.log("   - Clientes: 2");
    
  } catch (error) {
    console.error("❌ Error durante el seed:", error);
    throw error;
  }
}
