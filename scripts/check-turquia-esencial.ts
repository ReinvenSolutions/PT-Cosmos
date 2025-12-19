import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkTurquiaEsencial() {
  console.log("Verificando Turquía Esencial...\n");

  try {
    const turquia = await db.select().from(destinations).where(eq(destinations.name, "Turquía Esencial")).limit(1);
    
    if (turquia.length > 0) {
      console.log("Turquía Esencial encontrada:");
      console.log(JSON.stringify(turquia[0], null, 2));
    } else {
      console.log("❌ Turquía Esencial NO encontrada en la base de datos");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkTurquiaEsencial();
