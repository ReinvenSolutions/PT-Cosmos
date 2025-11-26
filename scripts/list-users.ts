
import { db } from "../server/db";
import { users } from "../shared/schema";

async function listUsers() {
  try {
    console.log("👥 Usuarios en la base de datos actual:");
    console.log("=".repeat(60));
    
    const allUsers = await db.select().from(users);
    
    for (const user of allUsers) {
      console.log(`\nID: ${user.id}`);
      console.log(`Nombre: ${user.name}`);
      console.log(`Username: ${user.username}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.role}`);
      console.log(`Creado: ${user.createdAt}`);
      console.log("-".repeat(60));
    }
    
    console.log(`\nTotal de usuarios: ${allUsers.length}`);
    process.exit(0);
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    process.exit(1);
  }
}

listUsers();
