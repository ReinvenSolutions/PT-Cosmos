
import { execSync } from "child_process";

const scripts = [
  "scripts/seed-users.ts",
  "scripts/sync-data.ts",
  "scripts/seed-cusco-4d.ts",
  "scripts/seed-cusco-huacachina-5d.ts",
  "scripts/seed-cusco-nazca-6d.ts",
  "scripts/seed-cusco-lima-7d.ts",
  "scripts/seed-cusco-completo-10d.ts",
  "scripts/seed-finlandia-auroras.ts",
  "scripts/seed-egipto-emiratos.ts",
  "scripts/seed-gran-tour-europa.ts",
  "scripts/seed-italia-turistica.ts",
  "scripts/seed-espana-italia-turistica.ts",
  "scripts/sync-images.ts",
  "scripts/fix-active-status.ts"
];

console.log("🚀 Iniciando Seed Completo de Producción...");

for (const script of scripts) {
  try {
    console.log(`\n▶️ Ejecutando: ${script}`);
    execSync(`npx tsx ${script}`, { stdio: "inherit" });
  } catch (error) {
    console.error(`❌ Error ejecutando ${script}`);
    process.exit(1);
  }
}

console.log("\n✅ Seed Completo Finalizado Exitosamente.");
