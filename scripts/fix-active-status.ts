
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function fixActiveStatus() {
  try {
    console.log("Reactivando todos los destinos...");
    await db.update(destinations).set({ isActive: true });
    console.log("¡Todos los destinos han sido reactivados!");
    process.exit(0);
  } catch (error) {
    console.error("Error al reactivar destinos:", error);
    process.exit(1);
  }
}

fixActiveStatus();
