import type { CosmosScreenContext } from "@shared/cosmosAgent";
import {
  parsePlanSheetIntent,
  resolvePlanSheetTurnFromCatalog,
  type PlanSheetTurn,
} from "@shared/cosmosPlanSheet";
import { getActiveCatalog } from "./cosmosKnowledge";

export async function resolvePlanSheetTurn(
  message: string,
  screen?: CosmosScreenContext
): Promise<PlanSheetTurn | null> {
  if (!parsePlanSheetIntent(message)) return null;
  const catalog = await getActiveCatalog();
  return resolvePlanSheetTurnFromCatalog(
    message,
    screen,
    catalog.map((plan) => ({ id: plan.id, name: plan.name, country: plan.country }))
  );
}
