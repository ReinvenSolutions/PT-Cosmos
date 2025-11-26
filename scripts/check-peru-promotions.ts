
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq, like } from "drizzle-orm";

async function listPeruDestinations() {
  const perus = await db.select().from(destinations).where(eq(destinations.country, "Perú"));
  perus.forEach(d => {
    console.log(`Name: "${d.name}", isPromotion: ${d.isPromotion}`);
  });
  process.exit(0);
}

listPeruDestinations();
