
import { db } from "../server/db";
import { destinations } from "../shared/schema";

async function listDestinations() {
  try {
    const allDestinations = await db.select().from(destinations);
    console.log("Destinos en la base de datos:");
    allDestinations.forEach(d => console.log(`- ${d.name} (ID: ${d.id}, Active: ${d.isActive})`));
    process.exit(0);
  } catch (error) {
    console.error("Error al listar destinos:", error);
    process.exit(1);
  }
}

listDestinations();
