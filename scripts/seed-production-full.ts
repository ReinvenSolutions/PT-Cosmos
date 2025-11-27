
import { execSync } from "child_process";

const scripts = [
  "scripts/seed-users.ts",
  "scripts/sync-data.ts",
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
