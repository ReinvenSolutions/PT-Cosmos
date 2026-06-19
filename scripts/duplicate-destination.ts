/**
 * Duplica un plan (destination) con itinerario, hoteles, inclusiones, exclusiones e imágenes.
 *
 * Uso:
 *   npx tsx scripts/duplicate-destination.ts "Turquía Esencial"
 *   npx tsx scripts/duplicate-destination.ts --id <uuid> --name "Copia Mi Plan"
 */
import { eq, ilike } from "drizzle-orm";
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { storage } from "../server/storage";

function parseArgs() {
  const args = process.argv.slice(2);
  let sourceId: string | undefined;
  let sourceName: string | undefined;
  let newName: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--id" && args[i + 1]) {
      sourceId = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      newName = args[++i];
    } else if (!args[i].startsWith("--")) {
      sourceName = args[i];
    }
  }

  return { sourceId, sourceName, newName };
}

async function findSource(sourceId?: string, sourceName?: string) {
  if (sourceId) {
    const dest = await storage.getDestination(sourceId);
    if (!dest) throw new Error(`No se encontró plan con id ${sourceId}`);
    return dest;
  }

  if (!sourceName) {
    throw new Error('Indica el nombre del plan o --id. Ej: npx tsx scripts/duplicate-destination.ts "Turquía Esencial"');
  }

  const rows = await db
    .select()
    .from(destinations)
    .where(ilike(destinations.name, `%${sourceName}%`));

  if (rows.length === 0) {
    throw new Error(`No se encontró ningún plan que coincida con "${sourceName}"`);
  }
  if (rows.length > 1) {
    console.log("Varios planes coinciden:");
    rows.forEach((r) => console.log(`  - ${r.name} (${r.id})`));
    throw new Error("Especifica --id para elegir uno.");
  }

  return rows[0];
}

async function main() {
  const { sourceId, sourceName, newName: customName } = parseArgs();
  const source = await findSource(sourceId, sourceName);
  const newName = customName ?? `Copia ${source.name}`;

  const existing = await db
    .select()
    .from(destinations)
    .where(eq(destinations.name, newName));
  if (existing.length > 0) {
    throw new Error(`Ya existe un plan llamado "${newName}" (${existing[0].id})`);
  }

  const [itinerary, hotels, inclusions, exclusions, images] = await Promise.all([
    storage.getItineraryDays(source.id),
    storage.getHotels(source.id),
    storage.getInclusions(source.id),
    storage.getExclusions(source.id),
    storage.getDestinationImages(source.id),
  ]);

  const {
    id: _id,
    createdAt: _createdAt,
    name: _name,
    ...rest
  } = source;

  const created = await storage.createDestination({
    ...rest,
    name: newName,
    displayOrder: (source.displayOrder ?? 999) + 1,
    isActive: source.isActive ?? true,
  });

  await Promise.all([
    itinerary.length
      ? storage.replaceItineraryDays(
          created.id,
          itinerary.map(({ destinationId: _d, id: _i, ...day }) => day),
        )
      : Promise.resolve(),
    hotels.length
      ? storage.replaceHotels(
          created.id,
          hotels.map(({ destinationId: _d, id: _i, ...hotel }) => hotel),
        )
      : Promise.resolve(),
    inclusions.length
      ? storage.replaceInclusions(
          created.id,
          inclusions.map(({ destinationId: _d, id: _i, ...item }) => item),
        )
      : Promise.resolve(),
    exclusions.length
      ? storage.replaceExclusions(
          created.id,
          exclusions.map(({ destinationId: _d, id: _i, ...item }) => item),
        )
      : Promise.resolve(),
    images.length
      ? storage.replaceDestinationImages(
          created.id,
          images.map(({ destinationId: _d, id: _i, createdAt: _c, ...img }) => img),
        )
      : Promise.resolve(),
  ]);

  console.log("✅ Plan duplicado correctamente");
  console.log(`   Origen:  ${source.name} (${source.id})`);
  console.log(`   Copia:   ${created.name} (${created.id})`);
  console.log(`   Datos:   ${itinerary.length} días, ${hotels.length} hoteles, ${inclusions.length} inclusiones, ${exclusions.length} exclusiones, ${images.length} imágenes`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
