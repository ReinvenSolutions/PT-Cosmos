
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkConnection() {
  console.log("Checking database connection...");
  
  // Get the connection string (masked)
  const dbUrl = process.env.DATABASE_URL || "";
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@");
  console.log(`Connected to: ${maskedUrl}`);

  // Extract Endpoint ID from URL
  const match = dbUrl.match(/ep-[a-z0-9-]+/);
  if (match) {
    console.log(`Neon Endpoint ID: ${match[0]}`);
  } else {
    console.log("Could not extract Endpoint ID from URL");
  }

  // Check specific data point we recently changed
  const peruDest = await db.query.destinations.findFirst({
    where: eq(destinations.name, "Perú 7D - 6N / Lima y Cusco")
  });

  if (peruDest) {
    console.log("\nData Verification:");
    console.log(`Destination: ${peruDest.name}`);
    console.log(`isPromotion: ${peruDest.isPromotion}`);
    console.log(`Last updated (approx): The script 'disable-peru-promotion.ts' set this to false.`);
  } else {
    console.log("\nCould not find 'Perú 7D - 6N / Lima y Cusco' in this database.");
  }

  process.exit(0);
}

checkConnection().catch(console.error);
