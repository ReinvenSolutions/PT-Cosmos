import type { Destination, Exclusion, Hotel, Inclusion, ItineraryDay } from "@shared/schema";
import { effectiveTrmFromBase, TRM_EFFECTIVE_SURCHARGE_COP } from "@shared/trm";
import {
  COMPANY_ADDRESS,
  COMPANY_RNT_LINE,
  OPERATIVE_MAIN,
  RESERVATIONS_EMAIL,
  TEAM_CONTACTS,
} from "@shared/companyContacts";
import {
  DAVIVIENDA_CARD_COMMISSION_PERCENT,
  DAVIVIENDA_PAYMENTS_LABEL,
  DAVIVIENDA_PAYMENTS_URL,
  MEDICAL_ASSISTANCE_PORTAL_LABEL,
  MEDICAL_ASSISTANCE_PORTAL_URL,
} from "@shared/externalServices";
import { getPlanCardTooltip } from "@shared/planCardTooltip";
import {
  formatCombinationRules,
  formatTaxStatusLabel,
  isTurkeyPlan,
  parseTaxInclusionStatus,
} from "@shared/planCosmosHints";
import { upgradesForPlan } from "@shared/cosmosQuoteUpgrades";
import type { CosmosScreenContext } from "@shared/cosmosAgent";
import { storage } from "../storage";
import { getOrSetCache } from "../utils/cache";
import { htmlToPlainText } from "../utils/sanitize";
import { COSMOS_APP_GUIDE } from "./cosmosAppGuide";
import { getCosmosAssistantConfig } from "./cosmosAssistantConfigService";
import { listCosmosStrategicContexts } from "./cosmosStrategicContextService";
import {
  COSMOS_CONTEXT_KIND_LABELS,
  pickRelevantStrategicContexts,
} from "@shared/cosmosStrategicContexts";

export type CosmosChatMessage = { role: "user" | "assistant"; content: string };

type FullPlan = Destination & {
  itinerary: ItineraryDay[];
  hotels: Hotel[];
  inclusions: Inclusion[];
  exclusions: Exclusion[];
};

const COSMOS_CATALOG_CACHE = "cosmos:catalog";
const COSMOS_ACTIVITY_INDEX_CACHE = "cosmos:activity-index";
const COSMOS_CATALOG_TTL = 600;
const COSMOS_PLAN_DETAIL_TTL = 180;
const MAX_DETAIL_PLANS = 5;

const ACTIVITY_STOPWORDS = new Set([
  "que",
  "cual",
  "cuales",
  "hay",
  "en",
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "de",
  "del",
  "al",
  "para",
  "por",
  "con",
  "y",
  "o",
  "me",
  "te",
  "se",
  "lo",
  "le",
  "actividad",
  "actividades",
  "recomendacion",
  "recomendaciones",
  "recomienda",
  "recomiendas",
  "hacer",
  "puedo",
  "podemos",
  "plan",
  "planes",
  "destino",
  "lugar",
  "sobre",
  "dime",
  "cuenta",
  "incluye",
  "incluida",
  "tour",
  "tours",
  "otro",
  "otra",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

async function fetchFullPlan(id: string): Promise<FullPlan | null> {
  const destination = await storage.getDestination(id);
  if (!destination) return null;
  const [itinerary, hotels, inclusions, exclusions] = await Promise.all([
    storage.getItineraryDays(id),
    storage.getHotels(id),
    storage.getInclusions(id),
    storage.getExclusions(id),
  ]);
  return { ...destination, itinerary, hotels, inclusions, exclusions };
}

async function getCachedPlanDetail(id: string, catalog: Destination[]): Promise<string | null> {
  return getOrSetCache(
    `cosmos:plan-detail:${id}`,
    async () => {
      const plan = await fetchFullPlan(id);
      return plan ? formatPlanDetail(plan, catalog) : null;
    },
    COSMOS_PLAN_DETAIL_TTL
  );
}

function formatCatalogLine(d: Destination): string {
  const upgrades = upgradesForPlan(d);
  const upgradeBit = upgrades.length
    ? ` — mejoras: ${upgrades.map((u) => `[${u.code}] ${u.name} USD ${u.price}`).join("; ")}`
    : "";
  return `- [${d.id}] ${d.name} (${d.country}) — ${d.duration}d/${d.nights}n — USD ${d.basePrice || "?"}${d.isBloqueo ? " [bloqueo]" : ""}${d.isPromotion ? " [promo]" : ""}${upgradeBit}`;
}

function formatPriceTiers(d: Destination): string {
  const tiers = Array.isArray(d.priceTiers) ? d.priceTiers : [];
  if (!tiers.length) return "Sin escalas de precio por fecha registradas.";
  return tiers
    .slice(0, 12)
    .map((t) => {
      const range = t.startDate ? `${t.startDate} → ${t.endDate}` : `hasta ${t.endDate}`;
      const flight = t.isFlightDay ? ` (día vuelo${t.flightLabel ? `: ${t.flightLabel}` : ""})` : "";
      return `  · ${range}: USD ${t.price}${flight}`;
    })
    .join("\n");
}

function formatUpgrades(d: Destination): string {
  const upgrades = upgradesForPlan(d);
  if (!upgrades.length) return "";
  return (
    "\nUpgrades opcionales:\n" +
    upgrades.map((u) => `  · [${u.code}] ${u.name}: USD ${u.price}${u.description ? ` — ${u.description}` : ""}`).join("\n")
  );
}

function formatCosmosAssistantNotes(plan: Destination): string {
  const notes = plan.cosmosAssistantNotes?.trim();
  if (!notes) return "";
  const plain = htmlToPlainText(notes);
  if (!plain) return "";
  return `\nNotas internas para Cosmos (NO publicar ni citar como texto del PDF; son contexto obligatorio del equipo):\n${plain}`;
}

function formatPlanDetail(plan: FullPlan, catalog: Destination[]): string {
  const inc = plan.inclusions.map((x) => `  + ${x.item}`).join("\n") || "  (sin registros)";
  const exc = plan.exclusions.map((x) => `  - ${x.item}`).join("\n") || "  (sin registros)";
  const hotels =
    plan.hotels.map((h) => `  · ${h.name}${h.category ? ` (${h.category})` : ""}${h.location ? ` — ${h.location}` : ""}${h.nights ? `, ${h.nights} noches` : ""}`).join("\n") ||
    "  (sin hoteles registrados)";
  const days = plan.itinerary
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const acts = day.activities?.length ? `\n    Actividades: ${day.activities.join("; ")}` : "";
      const meals = day.meals?.length ? `\n    Comidas: ${day.meals.join(", ")}` : "";
      const acc = day.accommodation ? `\n    Alojamiento: ${day.accommodation}` : "";
      return `  Día ${day.dayNumber} — ${day.title}${day.location ? ` (${day.location})` : ""}\n    ${day.description.slice(0, 800)}${acts}${meals}${acc}`;
    })
    .join("\n");

  let bloqueo = "";
  if (plan.isBloqueo) {
    bloqueo = `\nBloqueo: salida ${plan.bloqueoSalidaFecha ?? "—"}, cupos ${plan.bloqueoCuposDisponibles ?? "—"}`;
  }

  const cardTooltip = getPlanCardTooltip(plan, catalog);
  const taxStatus = parseTaxInclusionStatus(cardTooltip, plan.description, plan.termsConditions);

  return `
### Plan: ${plan.name} [id=${plan.id}]
País: ${plan.country} | ${plan.duration} días / ${plan.nights} noches | Categoría: ${plan.category ?? "—"}
Precio base terrestre: USD ${plan.basePrice || "—"}${plan.isPromotion ? " (promoción)" : ""}
Descripción: ${plan.description || "—"}
Impuestos: ${formatTaxStatusLabel(taxStatus)}
Tooltip de tarjeta (info al pasar el cursor en el catálogo): ${cardTooltip}
${bloqueo}
Escalas de precio:
${formatPriceTiers(plan)}
${formatUpgrades(plan)}
${plan.requiresTuesday ? "Requiere salida en martes. " : ""}${plan.requiresExtraDay ? "Requiere día extra. " : ""}${plan.allowedDays?.length ? `Días permitidos: ${plan.allowedDays.join(", ")}.` : ""}
${plan.hasInternalOrConnectionFlight ? `Vuelo interno: sí. En cotización aparece el paso «Vuelo interno del plan ${plan.name}». En el PDF se imprime después del día ${plan.internalFlightAfterDay ?? "(último día del itinerario si no está definido)"}.` : "Vuelo interno: no."}
${plan.flightTerms ? `Términos vuelo: ${plan.flightTerms}` : ""}
${plan.termsConditions ? `Términos: ${plan.termsConditions}` : ""}
${plan.recommendations ? `Recomendaciones (texto del PDF):\n${plan.recommendations}` : "Recomendaciones: (sin texto registrado)"}
${formatCosmosAssistantNotes(plan)}
${plan.medicalAssistanceInfo ? `Asistencia médica del plan: ${plan.medicalAssistanceInfo}` : ""}

Hoteles:
${hotels}

Incluye:
${inc}

No incluye:
${exc}

Itinerario:
${days || "  (sin itinerario)"}
`.trim();
}

export type CatalogActivityDay = {
  destinationId: string;
  dayNumber: number;
  title: string;
  location: string | null;
  activities: string[];
  description: string;
};

export type ActivityCatalogPlan = {
  id: string;
  name: string;
  country: string;
  recommendations: string | null;
};

export function activitySearchTokens(text: string): string[] {
  const seen = new Set<string>();
  const tokens: string[] = [];
  for (const word of normalize(text).split(/[^a-z0-9]+/)) {
    if (word.length < 3 || ACTIVITY_STOPWORDS.has(word) || seen.has(word)) continue;
    seen.add(word);
    tokens.push(word);
  }
  return tokens;
}

function excerptAround(text: string, tokens: string[], max = 500): string {
  const plain = text.replace(/\s+/g, " ").trim();
  if (plain.length <= max) return plain;
  const hay = normalize(plain);
  let at = -1;
  for (const token of tokens) {
    const idx = hay.indexOf(token);
    if (idx >= 0 && (at < 0 || idx < at)) at = idx;
  }
  if (at < 0) return `${plain.slice(0, max)}…`;
  const start = Math.max(0, at - 80);
  const slice = plain.slice(start, start + max);
  return `${start > 0 ? "…" : ""}${slice}${start + max < plain.length ? "…" : ""}`;
}

export function matchCatalogActivities(opts: {
  query: string;
  catalog: ActivityCatalogPlan[];
  days: CatalogActivityDay[];
  onlyPlanId?: string;
  limitPlans?: number;
}): { planIds: string[]; text: string } {
  const tokens = activitySearchTokens(opts.query);
  const limit = opts.limitPlans ?? 4;
  const plans = opts.catalog.filter((plan) => !opts.onlyPlanId || plan.id === opts.onlyPlanId);
  if (!plans.length) return { planIds: [], text: "" };

  const daysByPlan = new Map<string, CatalogActivityDay[]>();
  for (const day of opts.days) {
    if (opts.onlyPlanId && day.destinationId !== opts.onlyPlanId) continue;
    const list = daysByPlan.get(day.destinationId) ?? [];
    list.push(day);
    daysByPlan.set(day.destinationId, list);
  }

  if (!tokens.length) {
    if (!opts.onlyPlanId) return { planIds: [], text: "" };
    const plan = plans[0];
    return {
      planIds: [plan.id],
      text: formatActivityPlanBlock(plan, daysByPlan.get(plan.id) ?? [], tokens, true),
    };
  }

  const ranked = plans
    .map((plan) => {
      const days = daysByPlan.get(plan.id) ?? [];
      let score = 0;
      const name = normalize(`${plan.name} ${plan.country}`);
      const recs = normalize(htmlToPlainText(plan.recommendations ?? ""));
      for (const token of tokens) {
        if (name.includes(token)) score += 6;
        if (recs.includes(token)) score += 8;
      }
      const dayHits = days.filter((day) => {
        const blob = normalize(
          `${day.title} ${day.location ?? ""} ${day.activities.join(" ")} ${day.description}`
        );
        const hits = tokens.filter((token) => blob.includes(token)).length;
        if (hits) score += hits * 5;
        return hits > 0;
      });
      return { plan, days: dayHits.length ? dayHits : days, score, focused: dayHits.length > 0 };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (!ranked.length) return { planIds: [], text: "" };

  return {
    planIds: ranked.map((row) => row.plan.id),
    text: ranked
      .map((row) => formatActivityPlanBlock(row.plan, row.focused ? row.days : row.days.slice(0, 8), tokens, !row.focused))
      .join("\n\n"),
  };
}

function formatActivityPlanBlock(
  plan: ActivityCatalogPlan,
  days: CatalogActivityDay[],
  tokens: string[],
  listAllActivities: boolean
): string {
  const recPlain = htmlToPlainText(plan.recommendations ?? "").trim();
  const recLine = recPlain
    ? `Recomendaciones del plan:\n${excerptAround(recPlain, tokens, 900)}`
    : "Recomendaciones del plan: (sin texto registrado)";
  const shown = (listAllActivities ? days.slice(0, 8) : days.slice(0, 6))
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => {
      const acts = day.activities.length ? day.activities.join("; ") : "(sin actividades listadas)";
      const where = day.location ? ` (${day.location})` : "";
      const desc = day.description.replace(/\s+/g, " ").trim().slice(0, 280);
      return `- Día ${day.dayNumber} — ${day.title}${where}: ${acts}${desc ? `\n  ${desc}` : ""}`;
    });
  return `### ${plan.name} (${plan.country}) [id=${plan.id}]
${recLine}

Actividades del itinerario:
${shown.join("\n") || "- (sin itinerario)"}`;
}

async function getCatalogActivityDays(catalog: Destination[]): Promise<CatalogActivityDay[]> {
  return getOrSetCache(
    COSMOS_ACTIVITY_INDEX_CACHE,
    async () => {
      const rows = await storage.listItineraryDaysForDestinations(catalog.map((plan) => plan.id));
      return rows.map((day) => ({
        destinationId: day.destinationId,
        dayNumber: day.dayNumber,
        title: day.title,
        location: day.location,
        activities: day.activities ?? [],
        description: day.description ?? "",
      }));
    },
    COSMOS_CATALOG_TTL
  );
}

export async function searchActivitiesAndRecommendations(
  query: string,
  planId?: string
): Promise<{ planIds: string[]; text: string }> {
  const trimmed = query.trim();
  if (!trimmed && !planId) {
    return { planIds: [], text: "Indica el lugar, la actividad o el plan." };
  }
  const catalog = await getActiveCatalog();
  const days = await getCatalogActivityDays(catalog);
  const match = matchCatalogActivities({
    query: trimmed,
    catalog,
    days,
    onlyPlanId: planId,
  });
  if (!match.text) {
    return {
      planIds: [],
      text: `No encontré actividades ni recomendaciones para "${trimmed}" en los planes activos.`,
    };
  }
  return match;
}

export async function getActiveCatalog(): Promise<Destination[]> {
  return getOrSetCache(
    COSMOS_CATALOG_CACHE,
    () => storage.getDestinations({ isActive: true }),
    COSMOS_CATALOG_TTL
  );
}

function scorePlanMatch(text: string, plan: Destination): number {
  const hay = normalize(text);
  if (!hay) return 0;
  let score = 0;
  const name = normalize(plan.name);
  const country = normalize(plan.country);
  if (name.length > 3 && hay.includes(name)) score += 10;
  if (country.length > 2 && hay.includes(country)) score += 6;
  for (const word of name.split(/\s+/).filter((w) => w.length > 3)) {
    if (hay.includes(word)) score += 2;
  }
  const asksTurkey =
    hay.includes("turquia") ||
    hay.includes("turquia esencial") ||
    hay.includes("capadocia") ||
    hay.includes("estambul");
  if (asksTurkey && isTurkeyPlan(plan)) score += 20;
  if ((hay.includes("combin") || hay.includes("mezcl")) && isTurkeyPlan(plan)) score += 12;
  if ((hay.includes("impuesto") || hay.includes("tax")) && isTurkeyPlan(plan)) score += 15;
  if (
    (hay.includes("mejora") || hay.includes("upgrade")) &&
    upgradesForPlan(plan).length > 0
  ) {
    score += 8;
  }
  return score;
}

function uniqueLimited(ids: string[], limit: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= limit) break;
  }
  return out;
}

function pickRelevantPlanIds(
  userMessage: string,
  history: CosmosChatMessage[],
  catalog: Destination[],
  currentPlanId?: string,
  extraIds: string[] = [],
  activityPlanIds: string[] = []
): string[] {
  const recentUserText = [
    userMessage,
    ...history
      .filter((m) => m.role === "user")
      .slice(-4)
      .map((m) => m.content),
  ].join(" ");

  const hay = normalize(recentUserText);
  const asksTurkey =
    hay.includes("turquia") || hay.includes("capadocia") || hay.includes("estambul");
  const asksCombination = hay.includes("combin") || hay.includes("mezcl");
  const turkeyIds =
    asksTurkey || (asksCombination && hay.includes("turquia"))
      ? catalog.filter(isTurkeyPlan).map((plan) => plan.id)
      : [];

  const scored = catalog
    .map((p) => ({ id: p.id, score: scorePlanMatch(recentUserText, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const asked = scored.slice(0, MAX_DETAIL_PLANS).map((x) => x.id);
  // Lo que preguntó (otro destino, un lugar, una actividad) va antes que la ficha abierta.
  return uniqueLimited(
    [...activityPlanIds, ...turkeyIds, ...asked, ...(currentPlanId ? [currentPlanId] : []), ...extraIds],
    MAX_DETAIL_PLANS
  );
}

function formatAgencyContext(): string {
  const teamLines = TEAM_CONTACTS.map((c) => {
    const who = c.name ? `${c.name} — ` : "";
    return `- ${who}${c.phoneDisplay} (${c.area})`;
  }).join("\n");

  return `
## Cosmos Mayorista — contacto y servicios

### Dirección
${COMPANY_ADDRESS.full}

### Operativo principal
${OPERATIVE_MAIN.labelBeforePhone ?? OPERATIVE_MAIN.area}: ${OPERATIVE_MAIN.phoneDisplay} (${OPERATIVE_MAIN.note ?? "—"})
Correo de reservas: ${RESERVATIONS_EMAIL}

### Contactos por área
${teamLines}

### Registro
${COMPANY_RNT_LINE}

### Portal de pagos (botón superior en catálogo de planes)
${DAVIVIENDA_PAYMENTS_LABEL}
URL: ${DAVIVIENDA_PAYMENTS_URL}
Nota importante: los pagos con tarjeta tienen una comisión adicional del ${DAVIVIENDA_CARD_COMMISSION_PERCENT}% sobre el valor a pagar.

### Asistencia médica (botón superior en catálogo de planes)
${MEDICAL_ASSISTANCE_PORTAL_LABEL}
URL: ${MEDICAL_ASSISTANCE_PORTAL_URL}
`.trim();
}

function formatScreenContext(screen?: CosmosScreenContext): string {
  if (!screen?.path) return "";
  const draft = screen.quoteDraft;
  const upgrades =
    draft?.selectedUpgrades && Object.keys(draft.selectedUpgrades).length
      ? ` mejoras=${Object.entries(draft.selectedUpgrades)
          .map(([id, code]) => `${id}:${code || "ninguna"}`)
          .join(",")}`
      : "";
  const draftLine = draft
    ? `Borrador: planes=${(draft.planIds ?? []).join(",") || "—"} fecha=${draft.startDate || "—"} pax=${draft.passengers ?? "—"} origen=${draft.originCity || "—"} vuelos=${draft.flightsCost || "—"} ${draft.flightsCurrency || ""} asistencia=${draft.assistanceCost || "—"} ${draft.assistanceCurrency || ""} PVP=${draft.finalPrice || "—"} ${draft.finalPriceCurrency || ""} pagoMin=${draft.minPayment || "—"} archivo=${draft.customFilename || "—"}${upgrades}`
    : "Borrador: (vacío)";
  const hasDraft = (draft?.planIds?.length ?? 0) > 0;
  const resumeHint = hasDraft
    ? screen.path.startsWith("/cotizacion")
      ? "Hay una cotización en curso en pantalla. Si pide una NUEVA, pregunta si guardar o empezar limpia."
      : "Hay una cotización en curso (los datos están en el borrador). Si pide volver a ella, usa resume_quote. Si pide una NUEVA, pregunta si guardar o empezar limpia."
    : "No hay borrador de cotización.";
  return `## Pantalla actual
Ruta: ${screen.path}${screen.planId ? ` · planId=${screen.planId}` : ""}${screen.quoteId ? ` · quoteId=${screen.quoteId}` : ""}${screen.courseId ? ` · courseId=${screen.courseId}` : ""}
${draftLine}
${resumeHint}`;
}

function formatBriefContext(brief?: Record<string, unknown> | null): string {
  if (!brief || !Object.keys(brief).length) return "";
  return `## Brief del caso (sesión)\n${JSON.stringify(brief)}`;
}

export async function buildCosmosSystemContext(opts: {
  userMessage: string;
  history: CosmosChatMessage[];
  currentPlanId?: string;
  userRole: string;
  screen?: CosmosScreenContext;
  brief?: Record<string, unknown> | null;
}): Promise<string> {
  const catalog = await getActiveCatalog();
  const activityMatch = matchCatalogActivities({
    query: opts.userMessage,
    catalog,
    days: await getCatalogActivityDays(catalog),
  });
  const extraIds = [
    ...(opts.screen?.planId ? [opts.screen.planId] : []),
    ...(opts.screen?.quoteDraft?.planIds ?? []),
  ];
  const relevantIds = pickRelevantPlanIds(
    opts.userMessage,
    opts.history,
    catalog,
    opts.currentPlanId,
    extraIds,
    activityMatch.planIds
  );

  const catalogLines = catalog.map(formatCatalogLine);

  const detailBlocks = (
    await Promise.all(relevantIds.map((id) => getCachedPlanDetail(id, catalog)))
  ).filter((block): block is string => Boolean(block));

  const baseTrm = await storage.getGlobalTrmBase();
  const effectiveTrm = effectiveTrmFromBase(baseTrm);
  const trmBlock =
    baseTrm != null
      ? `TRM cotizador: base ${baseTrm.toLocaleString("es-CO")} COP/USD + ${TRM_EFFECTIVE_SURCHARGE_COP} = efectiva ${effectiveTrm?.toLocaleString("es-CO")} COP/USD.`
      : "TRM cotizador: no configurada (admin debe definir TRM global).";

  const roleNote =
    opts.userRole === "super_admin"
      ? "El usuario es administrador (acceso completo)."
      : opts.userRole === "provider"
        ? "El usuario es proveedor (gestiona sus propios planes, cotizaciones y clientes; solo ve sus propios datos)."
        : "El usuario es agencia de viajes (cotizaciones, mis clientes y academia; solo ve sus propias cotizaciones y clientes).";

  const cosmosConfig = await getCosmosAssistantConfig();
  const strategicContexts = await listCosmosStrategicContexts();
  const recentUserText = [
    opts.userMessage,
    ...opts.history.filter((m) => m.role === "user").slice(-4).map((m) => m.content),
  ].join(" ");
  const planNameById = new Map(catalog.map((plan) => [plan.id, plan.name]));
  const planHints = catalog.map((plan) => ({
    id: plan.id,
    name: plan.name,
    country: plan.country,
  }));
  const missingIds = strategicContexts
    .map((ctx) => ctx.destinationId)
    .filter((id): id is string => Boolean(id) && !planNameById.has(id));
  if (missingIds.length) {
    const extraPlans = await Promise.all(missingIds.map((id) => storage.getDestination(id)));
    for (const plan of extraPlans) {
      if (!plan) continue;
      planNameById.set(plan.id, plan.name);
      planHints.push({ id: plan.id, name: plan.name, country: plan.country });
    }
  }
  const matchedContexts = pickRelevantStrategicContexts(
    strategicContexts,
    recentUserText,
    relevantIds,
    planHints
  );
  const strategicFromModules = matchedContexts
    .map((ctx) => {
      const plain = htmlToPlainText(ctx.content).slice(0, 8000);
      if (!plain) return "";
      const planLabel = ctx.destinationId
        ? planNameById.get(ctx.destinationId) ?? "plan vinculado"
        : "sin plan vinculado";
      return `### ${ctx.name} (${COSMOS_CONTEXT_KIND_LABELS[ctx.kind]}) · ${planLabel}\n${plain}`;
    })
    .filter(Boolean)
    .join("\n\n");
  const legacyPlain =
    strategicContexts.length > 0 ? "" : htmlToPlainText(cosmosConfig.strategicContext);
  const strategicBody = strategicFromModules || legacyPlain;
  const strategicBlock = strategicBody
    ? `## Contexto estratégico de Cosmos Mayorista (información prioritaria del equipo)\nEsta información es obligatoria: úsala para responder sobre ese destino, actividad o plan. Si contradice una suposición, sigue este contexto. No digas que existe un módulo de contextos ni copies el texto de forma literal; intégralo con naturalidad.\n\n${strategicBody}`
    : "";

  const screenBlock = formatScreenContext(opts.screen);
  const briefBlock = formatBriefContext(opts.brief);

  return `
${COSMOS_APP_GUIDE}

---
${formatAgencyContext()}

---
${strategicBlock ? `${strategicBlock}\n\n---\n` : ""}${roleNote}
${trmBlock}
${screenBlock ? `\n${screenBlock}\n` : ""}${briefBlock ? `\n${briefBlock}\n` : ""}

## Catálogo de planes activos (${catalog.length})
${catalogLines.join("\n") || "(ningún plan activo)"}

---
${formatCombinationRules(catalog)}

${activityMatch.text ? `## Actividades y recomendaciones (cualquier plan, no solo el de pantalla)\nResponde con estos datos aunque el asesor esté en otra ficha o en el catálogo. No le pidas que abra el plan para contarle las actividades.\n\n${activityMatch.text}\n\n---\n` : ""}${detailBlocks.length ? `## Detalle de planes relevantes para esta consulta\n\n${detailBlocks.join("\n\n---\n\n")}` : "## Detalle ampliado\nUsa el catálogo. Si necesitas itinerario, inclusiones, actividades o recomendaciones de un plan concreto —esté o no en pantalla— usa search_activities o get_plan_details."}
`.trim();
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type CosmosPlanSummary = {
  id: string;
  name: string;
  country: string;
  duration: number;
  nights: number;
  basePrice: string | null;
  isBloqueo: boolean | null;
  isPromotion: boolean | null;
};

export async function searchCatalogPlans(query: string, limit = 8): Promise<CosmosPlanSummary[]> {
  const catalog = await getActiveCatalog();
  const scored = catalog
    .map((p) => ({ plan: p, score: scorePlanMatch(query, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const hay = normalize(query);
  const fallback = !scored.length
    ? catalog.filter(
        (p) =>
          (hay.length > 2 && normalize(p.name).includes(hay)) ||
          (hay.length > 2 && normalize(p.country).includes(hay))
      )
    : [];

  const picked = (scored.length ? scored.map((s) => s.plan) : fallback).slice(0, limit);
  return picked.map((p) => ({
    id: p.id,
    name: p.name,
    country: p.country,
    duration: p.duration,
    nights: p.nights,
    basePrice: p.basePrice,
    isBloqueo: p.isBloqueo,
    isPromotion: p.isPromotion,
  }));
}

export async function resolveCatalogPlanId(queryOrId: string): Promise<CosmosPlanSummary | null> {
  const trimmed = queryOrId.trim();
  if (!trimmed) return null;
  if (UUID_RE.test(trimmed)) {
    const catalog = await getActiveCatalog();
    const found = catalog.find((p) => p.id === trimmed);
    if (!found) return null;
    return {
      id: found.id,
      name: found.name,
      country: found.country,
      duration: found.duration,
      nights: found.nights,
      basePrice: found.basePrice,
      isBloqueo: found.isBloqueo,
      isPromotion: found.isPromotion,
    };
  }
  const matches = await searchCatalogPlans(trimmed, 1);
  return matches[0] ?? null;
}

export async function getPlanDetailText(planId: string): Promise<string | null> {
  const catalog = await getActiveCatalog();
  return getCachedPlanDetail(planId, catalog);
}

export async function getTrmSummary(): Promise<{
  baseTrm: number | null;
  effectiveTrm: number | null;
  surcharge: number;
  summary: string;
}> {
  const baseTrm = await storage.getGlobalTrmBase();
  const effectiveTrm = effectiveTrmFromBase(baseTrm);
  const summary =
    baseTrm != null
      ? `TRM cotizador: base ${baseTrm.toLocaleString("es-CO")} COP/USD + ${TRM_EFFECTIVE_SURCHARGE_COP} = efectiva ${effectiveTrm?.toLocaleString("es-CO")} COP/USD.`
      : "TRM cotizador: no configurada (admin debe definir TRM global).";
  return { baseTrm, effectiveTrm, surcharge: TRM_EFFECTIVE_SURCHARGE_COP, summary };
}
