/**
 * Seed de producción - SOLO usuarios y utilidades.
 *
 * IMPORTANTE: Este script NO ejecuta sync-data.ts para proteger los planes
 * que ya están en la base de datos. Los planes en producción son la fuente
 * de verdad y no deben ser sobrescritos por datos de desarrollo.
 *
 * Si necesitas sincronizar datos (peligroso en producción), ejecuta manualmente:
 *   ALLOW_PROD_DATA_SYNC=true npx tsx scripts/sync-data.ts
 */

import { execSync } from "child_process";

const scripts = [
  "scripts/seed-users.ts",
  "scripts/sync-images.ts",
  "scripts/fix-active-status.ts",
];

console.log("🚀 Iniciando Seed de Producción (usuarios + utilidades)...");
console.log("ℹ️  sync-data.ts omitido: protege los planes existentes en la BD\n");

for (const script of scripts) {
  try {
    console.log(`\n▶️ Ejecutando: ${script}`);
    execSync(`npx tsx ${script}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Error ejecutando ${script}`);
    process.exit(1);
  }
}

console.log("\n✅ Seed Finalizado Exitosamente.");
