import { z } from "zod";

/** Dispatch name del worker LiveKit. Web y SIP usan el mismo agente. */
export const COSMOS_LIVEKIT_AGENT_NAME = "cosmos";

export const COSMOS_CHANNELS = ["text", "voice", "sip"] as const;
export type CosmosChannel = (typeof COSMOS_CHANNELS)[number];

export const COSMOS_RPC = {
  openPlan: "open_plan",
  startQuote: "start_quote",
  action: "cosmos_action",
} as const;

export const COSMOS_HIGHLIGHT_TARGETS = [
  "catalog.search",
  "quote.plans",
  "quote.dates",
  "quote.passengers",
  "quote.upgrades",
  "quote.flights",
  "quote.flightsCost",
  "quote.assistanceCost",
  "quote.origin",
  "quote.costs",
  "quote.pvp",
  "quote.minPayment",
  "quote.filename",
  "quote.taxes",
  "quote.trm",
  "quote.save",
  "plan.inclusions",
  "plan.exclusions",
  "plan.itinerary",
  "plan.hotels",
  "plan.prices",
  "sidebar.quote",
  "sidebar.quoteExpress",
  "sidebar.quotes",
  "sidebar.clients",
  "sidebar.academy",
  "sidebar.dayCounter",
  "sidebar.miles",
  "sidebar.adminDashboard",
  "sidebar.adminPlans",
  "sidebar.adminUsers",
  "sidebar.adminClients",
  "sidebar.adminTutorials",
  "sidebar.adminCosmos",
  "app.trm",
] as const;

export type CosmosHighlightTarget = (typeof COSMOS_HIGHLIGHT_TARGETS)[number];

export const COSMOS_MONEY_CURRENCIES = ["USD", "COP"] as const;
export type CosmosMoneyCurrency = (typeof COSMOS_MONEY_CURRENCIES)[number];
export const cosmosMoneyCurrencySchema = z.enum(COSMOS_MONEY_CURRENCIES);

const cosmosMoneyAmountSchema = z.number().min(0).max(1_000_000_000);

export const cosmosQuotePatchSchema = z.object({
  planIds: z.array(z.string().uuid()).min(1).max(6).optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  passengers: z.number().int().min(1).max(50).optional(),
  originCity: z.string().max(80).optional(),
  flightsCost: cosmosMoneyAmountSchema.optional(),
  flightsCurrency: cosmosMoneyCurrencySchema.optional(),
  assistanceCost: cosmosMoneyAmountSchema.optional(),
  assistanceCurrency: cosmosMoneyCurrencySchema.optional(),
  finalPrice: cosmosMoneyAmountSchema.optional(),
  finalPriceCurrency: cosmosMoneyCurrencySchema.optional(),
  minPayment: cosmosMoneyAmountSchema.optional(),
  minPaymentPercent: z.number().int().min(1).max(100).optional(),
  customFilename: z.string().min(1).max(120).optional(),
  selectedUpgrades: z.record(z.string().uuid(), z.string().max(80)).optional(),
});

export type CosmosQuotePatch = z.infer<typeof cosmosQuotePatchSchema>;

export function formatCosmosQuoteMoney(
  amount: number,
  currency: CosmosMoneyCurrency = "USD"
): string {
  if (!Number.isFinite(amount) || amount < 0) return "";
  if (currency === "COP") return String(Math.round(amount));
  const cents = Math.round(amount * 100) / 100;
  return Number.isInteger(cents) ? String(cents) : cents.toFixed(2);
}

/** Un solo target por patch: el PVP va al final para no robar el scroll de otro campo. */
export function primaryQuoteHighlightTarget(
  patch: CosmosQuotePatch
): CosmosHighlightTarget | undefined {
  if (patch.passengers != null) return "quote.passengers";
  if (patch.startDate) return "quote.dates";
  if (patch.originCity) return "quote.origin";
  if (patch.planIds?.length) return "quote.plans";
  if (patch.selectedUpgrades) return "quote.upgrades";
  if (patch.flightsCost != null || patch.flightsCurrency) return "quote.flightsCost";
  if (patch.assistanceCost != null || patch.assistanceCurrency) return "quote.assistanceCost";
  if (patch.minPayment != null || patch.minPaymentPercent != null) return "quote.minPayment";
  if (patch.customFilename) return "quote.filename";
  if (patch.finalPrice != null || patch.finalPriceCurrency) return "quote.pvp";
  return undefined;
}

export const cosmosCaseBriefSchema = z.object({
  clientName: z.string().max(120).optional(),
  clientId: z.string().uuid().optional(),
  passengers: z.number().int().min(1).max(50).optional(),
  budgetUsd: z.number().min(0).optional(),
  dates: z.string().max(80).optional(),
  destinations: z.array(z.string().max(80)).max(8).optional(),
  notes: z.string().max(1000).optional(),
});

export type CosmosCaseBrief = z.infer<typeof cosmosCaseBriefSchema>;

export const cosmosScreenContextSchema = z.object({
  path: z.string().max(300),
  planId: z.string().uuid().optional(),
  quoteId: z.string().uuid().optional(),
  courseId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  quoteDraft: z
    .object({
      planIds: z.array(z.string().uuid()).max(6).optional(),
      startDate: z.string().max(32).optional(),
      passengers: z.number().int().min(1).max(50).optional(),
      originCity: z.string().max(80).optional(),
      flightsCost: z.string().max(32).optional(),
      flightsCurrency: cosmosMoneyCurrencySchema.optional(),
      assistanceCost: z.string().max(32).optional(),
      assistanceCurrency: cosmosMoneyCurrencySchema.optional(),
      finalPrice: z.string().max(32).optional(),
      finalPriceCurrency: cosmosMoneyCurrencySchema.optional(),
      minPayment: z.string().max(32).optional(),
      customFilename: z.string().max(120).optional(),
      selectedUpgrades: z.record(z.string().uuid(), z.string().max(80)).optional(),
    })
    .optional(),
});

export type CosmosScreenContext = z.infer<typeof cosmosScreenContextSchema>;

export const cosmosOpenPlanPayloadSchema = z.object({
  planId: z.string().uuid(),
});

export const cosmosStartQuotePayloadSchema = z.object({
  planIds: z.array(z.string().uuid()).min(1).max(6),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  replace: z.boolean().optional(),
});

export type CosmosOpenPlanPayload = z.infer<typeof cosmosOpenPlanPayloadSchema>;
export type CosmosStartQuotePayload = z.infer<typeof cosmosStartQuotePayloadSchema>;

export const cosmosExecutableActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open_plan"), planId: z.string().uuid() }),
  z.object({
    type: z.literal("start_quote"),
    planIds: z.array(z.string().uuid()).min(1).max(6),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    replace: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("navigate"),
    path: z.string().min(1).max(300),
    title: z.string().min(1).max(120),
  }),
  z.object({
    type: z.literal("highlight"),
    target: z.enum(COSMOS_HIGHLIGHT_TARGETS),
    query: z.string().max(80).optional(),
  }),
  z.object({ type: z.literal("patch_quote"), patch: cosmosQuotePatchSchema }),
  z.object({
    type: z.literal("save_quote"),
    clientId: z.string().uuid().optional(),
    clientName: z.string().min(1).max(120).optional(),
    clientEmail: z.string().min(1).max(120).optional(),
    thenReset: z.boolean().optional(),
  }),
  z.object({ type: z.literal("reset_quote") }),
  z.object({
    type: z.literal("refresh_admin"),
    scope: z.enum(["users", "plans", "dashboard", "all"]),
  }),
]);

export type CosmosExecutableAction = z.infer<typeof cosmosExecutableActionSchema>;

export const cosmosClientActionSchema: z.ZodType<CosmosClientAction> = z.union([
  cosmosExecutableActionSchema,
  z.object({
    type: z.literal("propose_action"),
    label: z.string().min(1).max(200),
    action: cosmosExecutableActionSchema,
  }),
]);

export type CosmosClientAction =
  | CosmosExecutableAction
  | { type: "propose_action"; label: string; action: CosmosExecutableAction };

export const cosmosAdminMutationSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("set_user_modules"),
    userId: z.string().uuid(),
    userLabel: z.string().min(1).max(160),
    enabledModules: z.object({
      quote: z.boolean(),
      quoteExpress: z.boolean(),
      dayCounter: z.boolean(),
      milesCalculator: z.boolean(),
      academy: z.boolean(),
      cosmos: z.boolean(),
      cosmosVoice: z.boolean(),
    }),
    milesProgramsAllowed: z.enum(["none", "lifemiles", "smiles", "both"]).optional(),
  }),
  z.object({
    kind: z.literal("set_plan_active"),
    planId: z.string().uuid(),
    planLabel: z.string().min(1).max(200),
    isActive: z.boolean(),
  }),
]);

export type CosmosAdminMutation = z.infer<typeof cosmosAdminMutationSchema>;

export function parseCosmosAdminMutation(raw: unknown): CosmosAdminMutation | null {
  const parsed = cosmosAdminMutationSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export type CosmosVoiceJobMetadata = {
  sessionId: string;
  userId: string;
  userRole: string;
  userName: string;
  currentPlanId?: string;
  channel: Extract<CosmosChannel, "voice" | "sip">;
  userIdentity: string;
  screen?: CosmosScreenContext;
};

export const cosmosVoiceJobMetadataSchema = z.object({
  sessionId: z.string().uuid(),
  userId: z.string().uuid(),
  userRole: z.string().min(1),
  userName: z.string().min(1),
  currentPlanId: z.string().uuid().optional(),
  channel: z.enum(["voice", "sip"]),
  userIdentity: z.string().min(1),
  screen: cosmosScreenContextSchema.optional(),
});

export function parseCosmosCaseBrief(raw: unknown): CosmosCaseBrief | null {
  const parsed = cosmosCaseBriefSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseCosmosClientAction(raw: unknown): CosmosClientAction | null {
  const parsed = cosmosClientActionSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseCosmosVoiceJobMetadata(raw: string | undefined): CosmosVoiceJobMetadata | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = cosmosVoiceJobMetadataSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function isCosmosProposal(
  action: CosmosClientAction
): action is { type: "propose_action"; label: string; action: CosmosExecutableAction } {
  return action.type === "propose_action";
}

export function unwrapCosmosAction(action: CosmosClientAction): CosmosExecutableAction {
  return action.type === "propose_action" ? action.action : action;
}

export function parseRpcAction(method: string, payload: string): CosmosClientAction | null {
  try {
    const raw = JSON.parse(payload || "{}") as unknown;
    if (method === COSMOS_RPC.action || method === "cosmos_action") {
      return parseCosmosClientAction(raw);
    }
    if (method === "open_plan" || method === COSMOS_RPC.openPlan) {
      const parsed = cosmosOpenPlanPayloadSchema.safeParse(raw);
      return parsed.success ? { type: "open_plan", planId: parsed.data.planId } : null;
    }
    if (method === "start_quote" || method === COSMOS_RPC.startQuote) {
      const parsed = cosmosStartQuotePayloadSchema.safeParse(raw);
      return parsed.success
        ? {
            type: "start_quote",
            planIds: parsed.data.planIds,
            startDate: parsed.data.startDate,
            replace: parsed.data.replace,
          }
        : null;
    }
    if (
      method === "navigate" ||
      method === "highlight" ||
      method === "patch_quote" ||
      method === "save_quote" ||
      method === "reset_quote" ||
      method === "refresh_admin" ||
      method === "propose_action"
    ) {
      return parseCosmosClientAction(raw);
    }
  } catch {
    return null;
  }
  return null;
}
