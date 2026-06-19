
import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

async function seedUsers() {
  console.log("👥 Creando usuarios en base de datos de producción...");

  try {
    // 1. Admin
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
      console.log("✅ Usuario 'admin' creado");
    } else {
      console.log("ℹ️  Usuario 'admin' ya existe");
    }

    // 2. Advisor 1
    const existingAdvisor1 = await db.select().from(users).where(sql`${users.username} = 'advisor1'`).limit(1);
    
    if (existingAdvisor1.length === 0) {
      const hashedPassword = await bcrypt.hash("advisor123", 10);
      await db.insert(users).values({
        name: "Asesor de Prueba",
        username: "advisor1",
        email: "advisor1@sistema.com",
        passwordHash: hashedPassword,
        role: "agency",
      });
      console.log("✅ Usuario 'advisor1' creado");
    } else {
      console.log("ℹ️  Usuario 'advisor1' ya existe");
    }

    // 3. Asesor Felipe
    const existingFelipe = await db.select().from(users).where(sql`${users.username} = 'felipe'`).limit(1);
    
    if (existingFelipe.length === 0) {
      const hashedPassword = await bcrypt.hash("felipe123", 10);
      await db.insert(users).values({
        name: "Felipe Asesor",
        username: "felipe",
        email: "felipe@cosmosviajes.com",
        passwordHash: hashedPassword,
        role: "agency",
      });
      console.log("✅ Usuario 'felipe' creado");
    } else {
      console.log("ℹ️  Usuario 'felipe' ya existe");
    }

    console.log("\n✅ Usuarios sincronizados correctamente");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error al crear usuarios:", error);
    process.exit(1);
  }
}

seedUsers();
