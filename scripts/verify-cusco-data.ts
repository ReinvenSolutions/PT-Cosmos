import { db } from "../server/db";
import { destinations, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  const destNames = [
    "Cusco Completo",
    "Cusco Extended",
    "Cusco + Huacachina",
    "Cusco + Viñac",
    "Cusco - Viñac",
    "Cusco - Huacachina",
    "Cusco - Huacachina - Lima",
    "Cusco - Paracas - Lima"
  ];
  
  console.log("Verificando datos procesados de Cusco:\n");
  
  for (const destName of destNames) {
    const [dest] = await db.select().from(destinations).where(eq(destinations.name, destName));
    if (dest) {
      const days = await db.select().from(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
      const inc = await db.select().from(inclusions).where(eq(inclusions.destinationId, dest.id));
      const exc = await db.select().from(exclusions).where(eq(exclusions.destinationId, dest.id));
      
      console.log(`✓ ${destName}`);
      console.log(`  - Días: ${days.length}`);
      console.log(`  - Inclusiones: ${inc.length}`);
      console.log(`  - Exclusiones: ${exc.length}`);
    } else {
      console.log(`⚠ ${destName} - No encontrado en BD`);
    }
  }
  
  console.log("\n✓ Verificación completada!");
}

main().catch(console.error).finally(() => process.exit(0));
