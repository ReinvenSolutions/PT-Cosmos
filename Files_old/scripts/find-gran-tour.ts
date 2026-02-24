import { db } from "../server/db";
import { destinations } from "@shared/schema";
import { like } from "drizzle-orm";

async function findGranTour() {
  try {
    const granTours = await db
      .select()
      .from(destinations)
      .where(like(destinations.name, "%Gran Tour%"));

    console.log("Destinos encontrados con 'Gran Tour':");
    granTours.forEach(dest => {
      console.log(`\n- Nombre: ${dest.name}`);
      console.log(`  ID: ${dest.id}`);
      console.log(`  País: ${dest.country}`);
      console.log(`  Activo: ${dest.isActive}`);
    });
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

findGranTour();
