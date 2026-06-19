#!/usr/bin/env npx tsx
/**
 * Elimina price tiers con fechas anteriores a hoy (zona horaria Colombia).
 *
 * Uso: npm run db:cleanup-expired-price-tiers
 * Requiere: DATABASE_URL en .env
 */

import "dotenv/config";
import { expirePriceTiers } from "../server/services/expirePriceTiers";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no configurado");
    process.exit(1);
  }

  console.log("🧹 Depurando price tiers vencidos...");
  const result = await expirePriceTiers();

  console.log(`   Fecha de referencia (Colombia): ${result.todayYmd}`);
  console.log(`   Planes revisados: ${result.plansChecked}`);
  console.log(`   Planes actualizados: ${result.plansUpdated}`);
  console.log(`   Fechas/precios eliminados: ${result.tiersRemoved}`);

  if (result.details.length > 0) {
    console.log("\n   Detalle:");
    for (const d of result.details) {
      console.log(`   - ${d.name}: ${d.removed} eliminado(s)`);
    }
  }

  console.log("\n✅ Depuración completada");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
