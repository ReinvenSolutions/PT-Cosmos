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
import { storage } from "../storage";
import { getOrSetCache } from "../utils/cache";
import { COSMOS_APP_GUIDE } from "./cosmosAppGuide";

export type CosmosChatMessage = { role: "user" | "assistant"; content: string };

type FullPlan = Destination & {
  itinerary: ItineraryDay[];
  hotels: Hotel[];
  inclusions: Inclusion[];
  exclusions: Exclusion[];
};

const COSMOS_CATALOG_CACHE = "cosmos:catalog";
const COSMOS_CATALOG_TTL = 600;
const MAX_DETAIL_PLANS = 4;

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
  const upgrades = Array.isArray(d.upgrades) ? d.upgrades : [];
  if (!upgrades.length) return "";
  return (
    "\nUpgrades opcionales:\n" +
    upgrades.map((u) => `  · [${u.code}] ${u.name}: USD ${u.price}${u.description ? ` — ${u.description}` : ""}`).join("\n")
  );
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

  return `
### Plan: ${plan.name} [id=${plan.id}]
País: ${plan.country} | ${plan.duration} días / ${plan.nights} noches | Categoría: ${plan.category ?? "—"}
Precio base terrestre: USD ${plan.basePrice || "—"}${plan.isPromotion ? " (promoción)" : ""}
Descripción: ${plan.description || "—"}
Tooltip de tarjeta (info al pasar el cursor en el catálogo): ${cardTooltip}
${bloqueo}
Escalas de precio:
${formatPriceTiers(plan)}
${formatUpgrades(plan)}
${plan.requiresTuesday ? "Requiere salida en martes. " : ""}${plan.requiresExtraDay ? "Requiere día extra. " : ""}${plan.allowedDays?.length ? `Días permitidos: ${plan.allowedDays.join(", ")}.` : ""}
${plan.flightTerms ? `Términos vuelo: ${plan.flightTerms}` : ""}
${plan.termsConditions ? `Términos: ${plan.termsConditions}` : ""}
${plan.recommendations ? `Recomendaciones (texto del PDF):\n${plan.recommendations}` : "Recomendaciones: (sin texto registrado)"}
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

async function getActiveCatalog(): Promise<Destination[]> {
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
  return score;
}

function pickRelevantPlanIds(
  userMessage: string,
  history: CosmosChatMessage[],
  catalog: Destination[],
  currentPlanId?: string
): string[] {
  const ids = new Set<string>();
  if (currentPlanId) ids.add(currentPlanId);

  const recentUserText = [
    userMessage,
    ...history
      .filter((m) => m.role === "user")
      .slice(-4)
      .map((m) => m.content),
  ].join(" ");

  const scored = catalog
    .map((p) => ({ id: p.id, score: scorePlanMatch(recentUserText, p) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  for (const { id } of scored.slice(0, MAX_DETAIL_PLANS)) {
    ids.add(id);
  }

  return Array.from(ids).slice(0, MAX_DETAIL_PLANS);
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

function formatCatalogTooltipsAndRecommendations(catalog: Destination[]): string {
  if (!catalog.length) return "(ningún plan activo)";

  return catalog
    .map((d) => {
      const tooltip = getPlanCardTooltip(d, catalog);
      const rec = d.recommendations?.trim();
      const recBlock = rec ? `\n  Recomendaciones PDF:\n  ${rec.split("\n").join("\n  ")}` : "\n  Recomendaciones PDF: (sin texto registrado)";
      return `- **${d.name}** (${d.country})\n  Tooltip tarjeta: ${tooltip}${recBlock}`;
    })
    .join("\n\n");
}

export async function buildCosmosSystemContext(opts: {
  userMessage: string;
  history: CosmosChatMessage[];
  currentPlanId?: string;
  userRole: string;
}): Promise<string> {
  const catalog = await getActiveCatalog();
  const relevantIds = pickRelevantPlanIds(opts.userMessage, opts.history, catalog, opts.currentPlanId);

  const catalogLines = catalog.map(
    (d) =>
      `- [${d.id}] ${d.name} (${d.country}) — ${d.duration}d/${d.nights}n — USD ${d.basePrice || "?"}${d.isBloqueo ? " [bloqueo]" : ""}${d.isPromotion ? " [promo]" : ""}`
  );

  const detailBlocks: string[] = [];
  for (const id of relevantIds) {
    const plan = await fetchFullPlan(id);
    if (plan) detailBlocks.push(formatPlanDetail(plan, catalog));
  }

  const baseTrm = await storage.getGlobalTrmBase();
  const effectiveTrm = effectiveTrmFromBase(baseTrm);
  const trmBlock =
    baseTrm != null
      ? `TRM cotizador: base ${baseTrm.toLocaleString("es-CO")} COP/USD + ${TRM_EFFECTIVE_SURCHARGE_COP} = efectiva ${effectiveTrm?.toLocaleString("es-CO")} COP/USD.`
      : "TRM cotizador: no configurada (admin debe definir TRM global).";

  const roleNote =
    opts.userRole === "super_admin"
      ? "El usuario es administrador (acceso completo)."
      : "El usuario es asesor de viajes (sin permisos de administración de planes/usuarios/TRM).";

  return `
${COSMOS_APP_GUIDE}

---
${formatAgencyContext()}

---
${roleNote}
${trmBlock}

## Catálogo de planes activos (${catalog.length})
${catalogLines.join("\n") || "(ningún plan activo)"}

## Tooltips de tarjetas y recomendaciones — todos los planes activos
${formatCatalogTooltipsAndRecommendations(catalog)}

${detailBlocks.length ? `## Detalle de planes relevantes para esta consulta\n\n${detailBlocks.join("\n\n---\n\n")}` : "## Detalle ampliado\nUsa el catálogo, tooltips y recomendaciones anteriores. Si necesitas itinerario, inclusiones o precios ampliados de un plan concreto, menciona el nombre del plan o país."}
`.trim();
}
