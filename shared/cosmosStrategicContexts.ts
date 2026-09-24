import { z } from "zod";

export const COSMOS_CONTEXT_KINDS = ["destination", "activity"] as const;
export type CosmosContextKind = (typeof COSMOS_CONTEXT_KINDS)[number];

export const COSMOS_CONTEXT_KIND_LABELS: Record<CosmosContextKind, string> = {
  destination: "Destino",
  activity: "Actividad",
};

/** Tope del documento de cada contexto (HTML). */
export const COSMOS_CONTEXT_CONTENT_MAX = 50000;
export const COSMOS_CONTEXT_NAME_MAX = 120;

export const cosmosStrategicContextSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(COSMOS_CONTEXT_NAME_MAX),
  kind: z.enum(COSMOS_CONTEXT_KINDS),
  content: z.string().max(COSMOS_CONTEXT_CONTENT_MAX),
  destinationId: z.string().min(1).nullable(),
  /** Si es true, Cosmos lo incluye en todas las conversaciones. */
  pinned: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type CosmosStrategicContext = z.infer<typeof cosmosStrategicContextSchema>;

export const cosmosStrategicContextWriteSchema = z.object({
  name: z.string().trim().min(1).max(COSMOS_CONTEXT_NAME_MAX),
  kind: z.enum(COSMOS_CONTEXT_KINDS),
  content: z.string().max(COSMOS_CONTEXT_CONTENT_MAX),
  destinationId: z.string().min(1).nullable().optional(),
  pinned: z.boolean().optional(),
});

export type CosmosStrategicContextWrite = z.infer<typeof cosmosStrategicContextWriteSchema>;

export type CosmosContextMatchInput = {
  id: string;
  name: string;
  kind: CosmosContextKind;
  destinationId: string | null;
  pinned: boolean;
};

export type CosmosContextPlanHint = {
  id: string;
  name: string;
  country: string;
};

const MAX_MATCHED_CONTEXTS = 4;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Elige los contextos que Cosmos debe ver en esta consulta.
 * Prioriza el plan vinculado y el nombre; los marcados como prioritarios entran siempre.
 */
export function pickRelevantStrategicContexts<T extends CosmosContextMatchInput>(
  contexts: T[],
  userText: string,
  relevantPlanIds: string[],
  plans: CosmosContextPlanHint[] = []
): T[] {
  const hay = normalize(userText);
  const planIds = new Set(relevantPlanIds.filter(Boolean));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  const scored = contexts.map((ctx) => {
    let score = ctx.pinned ? 100 : 0;
    const linked = ctx.destinationId ? planById.get(ctx.destinationId) : undefined;
    if (ctx.destinationId && planIds.has(ctx.destinationId)) score += 30;

    const name = normalize(ctx.name).trim();
    if (name.length > 2 && hay.includes(name)) score += 16;
    for (const word of name.split(/\s+/).filter((w) => w.length > 3)) {
      if (hay.includes(word)) score += 4;
    }

    if (linked) {
      const planName = normalize(linked.name);
      if (planName.length > 3 && hay.includes(planName)) score += 18;
      for (const word of planName.split(/\s+/).filter((w) => w.length > 3)) {
        if (hay.includes(word)) score += 4;
      }
      for (const country of normalize(linked.country).split(/[,/]/).map((part) => part.trim())) {
        if (country.length > 2 && hay.includes(country)) score += 14;
      }
    }
    return { ctx, score };
  });

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_MATCHED_CONTEXTS)
    .map((row) => row.ctx);
}
