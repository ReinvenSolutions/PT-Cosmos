import { db } from "../server/db";
import { destinations, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Muestra de datos extraídos: Cusco Completo (5D/4N) ===\n");
  
  const [dest] = await db.select().from(destinations).where(eq(destinations.name, "Cusco Completo"));
  if (!dest) {
    console.log("Destino no encontrado");
    return;
  }
  
  const days = await db.select().from(itineraryDays).where(eq(itineraryDays.destinationId, dest.id));
  console.log(`ITINERARIO (${days.length} días):`);
  days.slice(0, 3).forEach(d => {
    console.log(`\nDía ${d.dayNumber}: ${d.title}`);
    console.log(`  ${d.description.substring(0, 150)}...`);
  });
  
  const inc = await db.select().from(inclusions).where(eq(inclusions.destinationId, dest.id));
  console.log(`\n\nINCLUSIONES (${inc.length} items):`);
  inc.slice(0, 5).forEach(i => console.log(`  • ${i.item}`));
  console.log(`  ... y ${inc.length - 5} más`);
  
  const exc = await db.select().from(exclusions).where(eq(exclusions.destinationId, dest.id));
  console.log(`\n\nEXCLUSIONES (${exc.length} items):`);
  exc.forEach(e => console.log(`  • ${e.item}`));
}

main().catch(console.error).finally(() => process.exit(0));
