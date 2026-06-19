import { destinations } from "@shared/schema";
import { pruneExpiredPriceTiers, todayYmdInColombia } from "@shared/priceTiers";
import { db } from "../db";
import { eq, isNotNull } from "drizzle-orm";
import { clearDestinationCache } from "../utils/cache";
import { logger } from "../logger";

export interface ExpirePriceTiersResult {
  todayYmd: string;
  plansChecked: number;
  plansUpdated: number;
  tiersRemoved: number;
  details: Array<{ id: string; name: string; removed: number }>;
}

export async function expirePriceTiers(referenceDate?: string): Promise<ExpirePriceTiersResult> {
  const todayYmd = referenceDate ?? todayYmdInColombia();
  const rows = await db
    .select({
      id: destinations.id,
      name: destinations.name,
      priceTiers: destinations.priceTiers,
    })
    .from(destinations)
    .where(isNotNull(destinations.priceTiers));

  let plansUpdated = 0;
  let tiersRemoved = 0;
  const details: ExpirePriceTiersResult["details"] = [];

  for (const row of rows) {
    if (!row.priceTiers?.length) continue;
    const pruned = pruneExpiredPriceTiers(row.priceTiers, todayYmd);
    const removed = row.priceTiers.length - (pruned?.length ?? 0);
    if (removed === 0) continue;

    await db
      .update(destinations)
      .set({ priceTiers: pruned })
      .where(eq(destinations.id, row.id));

    clearDestinationCache(row.id);
    plansUpdated += 1;
    tiersRemoved += removed;
    details.push({ id: row.id, name: row.name, removed });
  }

  return {
    todayYmd,
    plansChecked: rows.length,
    plansUpdated,
    tiersRemoved,
    details,
  };
}

function msUntilNextColombiaMidnight(): number {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const second = Number(parts.find((p) => p.type === "second")?.value ?? 0);
  const msElapsedToday = (hour * 3600 + minute * 60 + second) * 1000;
  const msInDay = 24 * 3600 * 1000;
  // Ejecutar 2 minutos después de medianoche en Colombia.
  return msInDay - msElapsedToday + 2 * 60 * 1000;
}

let jobRunning = false;

async function runExpirePriceTiersJob(): Promise<void> {
  if (jobRunning) {
    logger.info("Depuración de price tiers omitida: ejecución previa en curso");
    return;
  }
  jobRunning = true;
  try {
    const result = await expirePriceTiers();
    if (result.tiersRemoved > 0) {
      logger.info("Price tiers vencidos eliminados", {
        todayYmd: result.todayYmd,
        plansUpdated: result.plansUpdated,
        tiersRemoved: result.tiersRemoved,
        details: result.details,
      });
    } else {
      logger.info("Depuración de price tiers: sin fechas vencidas", {
        todayYmd: result.todayYmd,
        plansChecked: result.plansChecked,
      });
    }
  } finally {
    jobRunning = false;
  }
}

/** Arranca la depuración al iniciar el servidor y la repite cada día a medianoche (Colombia). */
export function startPriceTierExpirationScheduler(): void {
  const INITIAL_DELAY_MS = 15_000;

  setTimeout(() => {
    runExpirePriceTiersJob().catch((err) =>
      logger.error("Error en depuración inicial de price tiers", { err }),
    );
  }, INITIAL_DELAY_MS);

  const scheduleNext = () => {
    const delay = msUntilNextColombiaMidnight();
    setTimeout(() => {
      runExpirePriceTiersJob()
        .catch((err) => logger.error("Error en depuración programada de price tiers", { err }))
        .finally(() => scheduleNext());
    }, delay);
  };

  scheduleNext();
}
