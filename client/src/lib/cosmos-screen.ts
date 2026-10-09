import type { CosmosMoneyCurrency, CosmosScreenContext } from "@shared/cosmosAgent";
import { rememberOpenedPlan } from "@shared/cosmosPlanSheet";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function asUuid(value?: string): string | undefined {
  return value && UUID_RE.test(value) ? value : undefined;
}

function asCurrency(value: unknown): CosmosMoneyCurrency | undefined {
  return value === "USD" || value === "COP" ? value : undefined;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function readQuoteDraftFromSession(): CosmosScreenContext["quoteDraft"] {
  try {
    const raw = sessionStorage.getItem("quoteData");
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as {
      destinations?: unknown;
      startDate?: unknown;
      passengers?: unknown;
      originCity?: unknown;
      flightsCost?: unknown;
      flightsCurrency?: unknown;
      assistanceCost?: unknown;
      assistanceCurrency?: unknown;
      finalPrice?: unknown;
      finalPriceCurrency?: unknown;
      minPayment?: unknown;
      customFilename?: unknown;
      selectedUpgrades?: unknown;
    };
    const planIds = Array.isArray(parsed.destinations)
      ? parsed.destinations.filter((id): id is string => typeof id === "string" && UUID_RE.test(id))
      : undefined;
    const selectedUpgrades =
      parsed.selectedUpgrades && typeof parsed.selectedUpgrades === "object" && !Array.isArray(parsed.selectedUpgrades)
        ? Object.fromEntries(
            Object.entries(parsed.selectedUpgrades as Record<string, unknown>).filter(
              (entry): entry is [string, string] => UUID_RE.test(entry[0]) && typeof entry[1] === "string"
            )
          )
        : undefined;
    return {
      planIds,
      startDate: typeof parsed.startDate === "string" ? parsed.startDate : undefined,
      passengers: typeof parsed.passengers === "number" ? parsed.passengers : undefined,
      originCity: typeof parsed.originCity === "string" ? parsed.originCity : undefined,
      flightsCost: asText(parsed.flightsCost),
      flightsCurrency: asCurrency(parsed.flightsCurrency),
      assistanceCost: asText(parsed.assistanceCost),
      assistanceCurrency: asCurrency(parsed.assistanceCurrency),
      finalPrice: asText(parsed.finalPrice),
      finalPriceCurrency: asCurrency(parsed.finalPriceCurrency),
      minPayment: asText(parsed.minPayment),
      customFilename: asText(parsed.customFilename),
      selectedUpgrades,
    };
  } catch {
    return undefined;
  }
}

const PLAN_SHEET_MEMORY_KEY = "cosmosPlanSheetMemory";

type StoredPlanSheetMemory = { planId?: string; history?: string[] };

function readPlanSheetMemory(): { planId?: string; history: string[] } {
  try {
    const raw = sessionStorage.getItem(PLAN_SHEET_MEMORY_KEY);
    if (!raw) return { history: [] };
    const parsed = JSON.parse(raw) as StoredPlanSheetMemory;
    const history = Array.isArray(parsed.history)
      ? parsed.history.filter((id): id is string => typeof id === "string" && UUID_RE.test(id)).slice(-8)
      : [];
    const planId = typeof parsed.planId === "string" && UUID_RE.test(parsed.planId) ? parsed.planId : undefined;
    return { planId, history };
  } catch {
    return { history: [] };
  }
}

/** Recuerda la ficha anterior cuando se pasa de un programa a otro. */
export function syncPlanSheetHistory(path: string): string[] {
  try {
    const next = asUuid(path.match(/^\/plan\/([^/?#]+)/)?.[1]);
    if (!next) {
      sessionStorage.setItem(PLAN_SHEET_MEMORY_KEY, JSON.stringify({ history: [] }));
      return [];
    }
    const memory = readPlanSheetMemory();
    const history = rememberOpenedPlan(memory.history, memory.planId, next);
    sessionStorage.setItem(PLAN_SHEET_MEMORY_KEY, JSON.stringify({ planId: next, history }));
    return history;
  } catch {
    return [];
  }
}

export function buildCosmosScreenContext(path: string): CosmosScreenContext {
  const planMatch = path.match(/^\/plan\/([^/?#]+)/);
  const quoteMatch = path.match(/^\/advisor\/quotes\/([^/?#]+)/);
  const courseMatch = path.match(/^\/tutoriales\/curso\/([^/?#]+)/);
  const lessonMatch = path.match(/^\/tutoriales\/curso\/[^/]+\/leccion\/([^/?#]+)/);
  const quoteDraft = readQuoteDraftFromSession();
  const planId = asUuid(planMatch?.[1]);
  const planSheetHistory = syncPlanSheetHistory(path);
  return {
    path,
    planId,
    quoteId: asUuid(quoteMatch?.[1]),
    courseId: asUuid(courseMatch?.[1]),
    lessonId: asUuid(lessonMatch?.[1]),
    ...(planSheetHistory.length ? { planSheetHistory } : {}),
    quoteDraft,
  };
}
