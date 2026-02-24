
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkConnection() {
  console.log("Checking database connection...");
  
  // Get the connection string (masked)
  const dbUrl = process.env.DATABASE_URL || "";
  const maskedUrl = dbUrl.replace(/:[^:@]+@/, ":****@");
  console.log(`Connected to: ${maskedUrl}`);

  // Extraer host de la URL
  const hostMatch = dbUrl.match(/@([^:/]+)/);
  if (hostMatch) {
    console.log(`Host: ${hostMatch[1]}`);
  }

  // Check specific data point we recently changed
  const peruDest = await db.query.destinations.findFirst({
    where: eq(destinations.name, "Perú 7D - 6N / Lima y Cusco")
  });

  if (peruDest) {
    console.log("\nData Verification:");
    console.log(`Destination: ${peruDest.name}`);
    console.log(`isPromotion: ${peruDest.isPromotion}`);
  } else {
    console.log("\nCould not find 'Perú 7D - 6N / Lima y Cusco' in this database.");
  }

  process.exit(0);
}

checkConnection().catch(console.error);
