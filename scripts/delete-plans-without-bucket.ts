#!/usr/bin/env npx tsx
/**
 * Elimina planes de la BD que NO tienen un bucket asociado en Supabase.
 * Mantiene solo los planes que tienen bucket plan-{slug} en Supabase.
 *
 * Uso: npx tsx scripts/delete-plans-without-bucket.ts
 * Requiere: DATABASE_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY en .env
 */

import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import { listAllBuckets, getPlanBucketName } from "../server/supabaseStorage";
import { DatabaseStorage } from "../server/storage";

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
  const storage = new DatabaseStorage();

  console.log("🔍 Obteniendo planes de la BD...");
  const allPlans = await db.select({ id: schema.destinations.id, name: schema.destinations.name }).from(schema.destinations);
  console.log(`   ${allPlans.length} planes encontrados en BD`);

  console.log("\n🔍 Listando buckets en Supabase...");
  const allBuckets = await listAllBuckets();
  const planBuckets = new Set(allBuckets.filter((b) => b.startsWith("plan-")));
  console.log(`   ${planBuckets.size} buckets plan-* en Supabase`);

  const plansWithoutBucket = allPlans.filter((p) => !planBuckets.has(getPlanBucketName(p.name)));
  const plansWithBucket = allPlans.filter((p) => planBuckets.has(getPlanBucketName(p.name)));

  console.log("\n📋 Resumen:");
  console.log(`   ✅ Planes con bucket (se mantienen): ${plansWithBucket.length}`);
  plansWithBucket.forEach((p) => console.log(`      - ${p.name} (${getPlanBucketName(p.name)})`));
  console.log(`   ❌ Planes sin bucket (se eliminarán): ${plansWithoutBucket.length}`);
  plansWithoutBucket.forEach((p) => console.log(`      - ${p.name} (${getPlanBucketName(p.name)})`));

  if (plansWithoutBucket.length === 0) {
    console.log("\n✅ No hay planes sin bucket. Nada que eliminar.");
    await pool.end();
    return;
  }

  console.log("\n⏳ Eliminando planes sin bucket...");
  const deleted: string[] = [];
  const skipped: { name: string; reason: string }[] = [];

  for (const plan of plansWithoutBucket) {
    try {
      const quoteCount = await storage.countQuotesByDestination(plan.id);
      if (quoteCount > 0) {
        skipped.push({ name: plan.name, reason: `Tiene ${quoteCount} cotización(es) asociada(s)` });
        continue;
      }
      await storage.deleteDestination(plan.id);
      deleted.push(plan.name);
      console.log(`   ✓ Eliminado: ${plan.name}`);
    } catch (err) {
      const msg = (err as Error).message;
      skipped.push({ name: plan.name, reason: msg });
      console.log(`   ⚠ Omitido: ${plan.name} - ${msg}`);
    }
  }

  console.log(`\n✅ Eliminados: ${deleted.length}`);
  if (skipped.length > 0) {
    console.log(`\n⚠️ Omitidos (${skipped.length}):`);
    skipped.forEach((s) => console.log(`   - ${s.name}: ${s.reason}`));
  }

  await pool.end();
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
