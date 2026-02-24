
import { db } from "../server/db";
import { destinations } from "../shared/schema";

async function listDestinations() {
  const allDestinations = await db.select().from(destinations);
  console.log("Destinos en la base de datos:");
  allDestinations.forEach(d => {
    console.log(`- ${d.name} (${d.country}) [Category: ${d.category}]`);
  });
  process.exit(0);
}

listDestinations();
