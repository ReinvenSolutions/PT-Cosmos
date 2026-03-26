#!/usr/bin/env npx tsx
/**
 * Elimina buckets de Supabase Storage que no tienen un plan asociado en la BD.
 * Mantiene solo: images, medical-assistance, itinerary-maps y plan-{slug} de planes existentes.
 *
 * Uso: npm run db:cleanup-orphan-buckets
 * Requiere: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import {
  deleteOrphanPlanBuckets,
  listAllBuckets,
  getPlanBucketName,
  getPlanHotelsBucketName,
  getPlanAdicionalesBucketName,
} from "../server/supabaseStorage";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL no configurado");
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY requeridos");
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("🔍 Obteniendo planes de la BD...");
  const destinations = await db.select({ name: schema.destinations.name }).from(schema.destinations);
  const destinationNames = destinations.map((d) => d.name);

  console.log(`   ${destinationNames.length} planes encontrados`);
  const validBuckets = new Set(
    destinationNames.flatMap((n) => [
      getPlanBucketName(n),
      getPlanHotelsBucketName(n),
      getPlanAdicionalesBucketName(n),
    ])
  );
  validBuckets.forEach((b) => console.log(`   - ${b}`));

  console.log("\n🔍 Listando buckets en Supabase...");
  const allBuckets = await listAllBuckets();
  const planBuckets = allBuckets.filter((b) => b.startsWith("plan-"));
  const orphanBuckets = planBuckets.filter((b) => !validBuckets.has(b));

  if (orphanBuckets.length === 0) {
    console.log("\n✅ No hay buckets huérfanos. Todos los buckets plan-* tienen plan asociado.");
    await pool.end();
    return;
  }

  console.log(`\n🗑️  Buckets huérfanos a eliminar (${orphanBuckets.length}):`);
  orphanBuckets.forEach((b) => console.log(`   - ${b}`));

  console.log("\n⏳ Eliminando...");
  const result = await deleteOrphanPlanBuckets(destinationNames);

  console.log(`\n✅ Eliminados: ${result.deleted.length}`);
  result.deleted.forEach((b) => console.log(`   ✓ ${b}`));

  if (result.errors.length > 0) {
    console.log(`\n⚠️  Errores (${result.errors.length}):`);
    result.errors.forEach((e) => console.log(`   ✗ ${e.bucket}: ${e.error}`));
  }

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
