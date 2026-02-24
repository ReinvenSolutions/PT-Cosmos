/**
 * MIGRACIÓN: Neon → Supabase (Producción)
 *
 * Migra todos los datos de la base de datos de producción en Neon a Supabase
 * preservando usuarios, contraseñas (hashes bcrypt), y todos los datos.
 *
 * REQUISITOS PREVIOS:
 * 1. Crear proyecto en Supabase
 * 2. Ejecutar schema en Supabase:
 *    DATABASE_URL="<SUPABASE_URL>" npx drizzle-kit push
 *
 * USO (lee desde .env si están definidas):
 *   npx tsx scripts/migrate-neon-to-supabase.ts
 *   # O con variables explícitas:
 *   NEON_DATABASE_URL="<url_neon>" SUPABASE_DATABASE_URL="<url_supabase>" npx tsx scripts/migrate-neon-to-supabase.ts
 *
 * Supabase: postgresql://postgres:[PASSWORD]@db.himyxbrdsnxryetlogzk.supabase.co:5432/postgres
 */

import "dotenv/config";
import pkg from "pg";
const { Pool } = pkg;
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../shared/schema";
import {
  destinations,
  destinationImages,
  itineraryDays,
  hotels,
  inclusions,
  exclusions,
  users,
  clients,
  quotes,
  quoteDestinations,
  quoteLogs,
  sessions,
} from "../shared/schema";
import { sql } from "drizzle-orm";

const NEON_URL = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;

if (!NEON_URL) {
  console.error("❌ NEON_DATABASE_URL o DATABASE_URL es requerida");
  process.exit(1);
}
if (!SUPABASE_URL) {
  console.error("❌ SUPABASE_DATABASE_URL es requerida");
  process.exit(1);
}

// Orden de tablas respetando foreign keys (padres antes que hijos)
const TABLE_CONFIG = [
  { name: "destinations", table: destinations, label: "Destinos" },
  { name: "destination_images", table: destinationImages, label: "Imágenes de destinos" },
  { name: "itinerary_days", table: itineraryDays, label: "Días de itinerario" },
  { name: "hotels", table: hotels, label: "Hoteles" },
  { name: "inclusions", table: inclusions, label: "Inclusiones" },
  { name: "exclusions", table: exclusions, label: "Exclusiones" },
  { name: "users", table: users, label: "Usuarios" },
  { name: "clients", table: clients, label: "Clientes" },
  { name: "quotes", table: quotes, label: "Cotizaciones" },
  { name: "quote_destinations", table: quoteDestinations, label: "Destinos por cotización" },
  { name: "quote_logs", table: quoteLogs, label: "Logs de cotizaciones" },
  { name: "sessions", table: sessions, label: "Sesiones" },
] as const;

async function migrateTable(
  sourceDb: ReturnType<typeof drizzle>,
  targetDb: ReturnType<typeof drizzle>,
  config: (typeof TABLE_CONFIG)[number]
) {
  const { table, label } = config;
  const rows = await sourceDb.select().from(table);

  if (rows.length === 0) {
    console.log(`   ⏭️  ${label}: 0 registros (omitido)`);
    return { count: 0, migrated: 0 };
  }

  try {
    // Insertar en lotes de 50 para tablas grandes
    const BATCH_SIZE = 50;
    let migrated = 0;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      await targetDb.insert(table).values(batch as never[]);
      migrated += batch.length;
    }

    console.log(`   ✅ ${label}: ${migrated} registros`);
    return { count: rows.length, migrated };
  } catch (err) {
    console.error(`   ❌ ${label}: Error`, err);
    throw err;
  }
}

async function verifyCounts(
  sourceDb: ReturnType<typeof drizzle>,
  targetDb: ReturnType<typeof drizzle>
) {
  console.log("\n📋 Verificación de conteos:");
  let hasError = false;

  for (const config of TABLE_CONFIG) {
    const [sourceCount] = await sourceDb
      .select({ count: sql<number>`count(*)::int` })
      .from(config.table);
    const [targetCount] = await targetDb
      .select({ count: sql<number>`count(*)::int` })
      .from(config.table);

    const src = sourceCount?.count ?? 0;
    const tgt = targetCount?.count ?? 0;
    const ok = src === tgt;

    if (!ok) hasError = true;
    console.log(`   ${ok ? "✅" : "❌"} ${config.label}: Neon=${src} | Supabase=${tgt}`);
  }

  return !hasError;
}

async function main() {
  console.log("\n==========================================");
  console.log("🚀 MIGRACIÓN NEON → SUPABASE (Producción)");
  console.log("==========================================\n");

  const neonPool = new Pool({
    connectionString: NEON_URL,
    ssl: { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" },
  });
  const supabasePool = new Pool({
    connectionString: SUPABASE_URL,
    ssl: { rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED !== "0" },
  });

  const neonDb = drizzle(neonPool, { schema });
  const supabaseDb = drizzle(supabasePool, { schema });

  try {
    // 1. Probar conexiones
    console.log("1️⃣  Verificando conexiones...");
    await neonPool.query("SELECT 1");
    await supabasePool.query("SELECT 1");
    console.log("   ✅ Ambas conexiones OK\n");

    // 2. Migrar cada tabla
    console.log("2️⃣  Migrando datos (preservando contraseñas y todos los campos)...\n");

    let totalMigrated = 0;
    for (const config of TABLE_CONFIG) {
      const { migrated } = await migrateTable(neonDb, supabaseDb, config);
      totalMigrated += migrated;
    }

    console.log(`\n   📊 Total: ${totalMigrated} registros migrados\n`);

    // 3. Verificación
    console.log("3️⃣  Verificando integridad...");
    const verified = await verifyCounts(neonDb, supabaseDb);

    // 4. Verificar usuarios (contraseñas)
    console.log("\n4️⃣  Verificación de usuarios y contraseñas:");
    const neonUsers = await neonDb.select().from(users);
    const supabaseUsers = await supabaseDb.select().from(users);

    for (const u of neonUsers) {
      const match = supabaseUsers.find((su) => su.id === u.id);
      if (!match) {
        console.log(`   ❌ Usuario faltante en Supabase: ${u.username}`);
      } else if (match.passwordHash !== u.passwordHash) {
        console.log(`   ❌ Hash de contraseña difiere para: ${u.username}`);
      } else {
        console.log(`   ✅ ${u.username} (password_hash preservado)`);
      }
    }

    if (verified) {
      console.log("\n==========================================");
      console.log("✅ MIGRACIÓN COMPLETADA EXITOSAMENTE");
      console.log("==========================================");
      console.log("\nPróximos pasos:");
      console.log("1. Actualiza DATABASE_URL en Railway con la URL de Supabase");
      console.log("2. Prueba el login de usuarios en la app");
      console.log("3. Verifica que las cotizaciones y datos se muestren correctamente");
      console.log("4. Mantén Neon activo hasta confirmar que todo funciona\n");
    } else {
      console.log("\n⚠️  Algunos conteos no coinciden. Revisa los errores antes de continuar.\n");
      process.exit(1);
    }
  } finally {
    await neonPool.end();
    await supabasePool.end();
  }
}

main().catch((err) => {
  console.error("\n❌ Error fatal:", err);
  process.exit(1);
});
