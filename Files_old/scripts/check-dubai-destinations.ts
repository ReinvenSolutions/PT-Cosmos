import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { like, asc } from "drizzle-orm";

async function checkDubaiDestinations() {
  console.log("Buscando destinos de Dubai...\n");

  try {
    const dubaiDests = await db
      .select()
      .from(destinations)
      .where(like(destinations.name, '%Dubai%'))
      .orderBy(asc(destinations.displayOrder));

    console.log("Destinos encontrados con 'Dubai' en el nombre:\n");
    dubaiDests.forEach(dest => {
      console.log(`${dest.isActive ? '✅' : '❌'} [${dest.displayOrder}] ${dest.name}`);
      console.log(`   País: ${dest.country}`);
      console.log(`   ID: ${dest.id}\n`);
    });

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

checkDubaiDestinations();
