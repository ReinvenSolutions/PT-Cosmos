import type { CosmosScreenContext } from "./cosmosAgent";

/** Plan, programa, ficha técnica e itinerario son la misma pantalla: /plan/:id */
export const COSMOS_PLAN_SHEET_HISTORY_LIMIT = 8;

export type PlanSheetFocus = "itinerary" | "sheet";

export type PlanSheetIntent =
  | { type: "open"; query: string | null; focus: PlanSheetFocus; other: boolean }
  | { type: "back" };

export type PlanSheetCatalogPlan = {
  id: string;
  name: string;
  country: string;
};

export type PlanSheetScreenPatch = {
  planId: string;
  path: string;
  planSheetHistory: string[];
};

export type PlanSheetTurn = {
  reply: string;
  action?:
    | { type: "open_plan"; planId: string }
    | { type: "highlight"; target: "plan.itinerary" };
  screenPatch?: PlanSheetScreenPatch;
};

const GREETING_RE = /^(?:hola|oye|cosmos|buenas|por favor|porfa)\s+/;
const TRAILING_PLEASE_RE = /\s+(?:por favor|porfa)$/;

const NAV_START_RE =
  /^(?:llevame|muestrame|muetsrame|ensename|abreme|abre|quiero ver|quiero ir a|quiero ir|vamos a ver|vamos a|veamos|pasame|ponme|ver|ir a|ve a)\b/;

const CONTENT_RE =
  /\b(?:precio|cuesta|cuanto|incluye|inclusion|inclusiones|actividad|actividades|recomend\w*|hotel|hoteles|impuesto|impuestos|que es|que tiene|que incluyen|explic\w*|cuentame|hablame|compar\w*|diferenc\w*)\b/;

const SHEET_NOUN_RE = /\b(?:ficha tecnica|itinerarios|itinerario|programas|programa|planes|plan|ficha)\b/;

const APP_PLACE_RE =
  /^(?:cotizacion|cotizar|catalogo|inicio|home|clientes|academia|express|dashboard|millas|usuarios)$/;

const STOPWORD_RE =
  /\b(?:a|al|el|la|los|las|de|del|un|una|por|favor|porfa|me|otro|otra|ese|esa|este|esta|anterior|tecnica|tecnico)\b/g;

export function normalizePlanSheetText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?¡!.,;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function coreRequest(normalized: string): string {
  let text = normalized;
  while (GREETING_RE.test(text)) text = text.replace(GREETING_RE, "");
  return text.replace(TRAILING_PLEASE_RE, "").trim();
}

function isQuoteReturn(text: string): boolean {
  return (
    /\b(?:cotizacion|cotizar|presupuesto)\b/.test(text) &&
    /\b(?:regres|volv|vuelv|de vuelta|atras)\b/.test(text)
  );
}

function isBareBack(text: string): boolean {
  return /^(?:regresa|regresemos|vuelve|volvamos|devuelvete|atras|para atras|de vuelta|llevame de vuelta|llevame atras|llevame para atras|muestrame el anterior|muestrame la anterior)(?: (?:al|a la|a el|el|la)(?: (?:plan|programa|itinerario|ficha|ficha tecnica))?(?: anterior)?)?$/.test(
    text
  );
}

function extractOpenDetails(text: string): { query: string | null; focus: PlanSheetFocus; other: boolean } {
  const focus: PlanSheetFocus = /\bitinerario/.test(text) ? "itinerary" : "sheet";
  const other = /\botro\b|\botra\b/.test(text);
  let rest = text
    .replace(NAV_START_RE, " ")
    .replace(/^(?:regresa|regresemos|vuelve|volvamos|llevame de vuelta)\b/, " ")
    .replace(/\b(?:ficha tecnica|itinerarios|itinerario|programas|programa|planes|plan|ficha)\b/g, " ")
    .replace(STOPWORD_RE, " ")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (APP_PLACE_RE.test(rest)) rest = "";
  return { query: rest.length >= 2 ? rest : null, focus, other };
}

/**
 * "Llévame / muéstrame el plan, el programa, la ficha técnica o el itinerario"
 * abre la ficha. "Regresa" vuelve a la ficha anterior, salvo que pidan la cotización.
 */
export function parsePlanSheetIntent(message: string): PlanSheetIntent | null {
  const normalized = normalizePlanSheetText(message);
  if (!normalized) return null;
  if (isQuoteReturn(normalized)) return null;

  const core = coreRequest(normalized);
  if (!core) return null;
  if (isBareBack(core)) return { type: "back" };
  if (CONTENT_RE.test(core)) return null;

  const startsNav = NAV_START_RE.test(core);
  const startsReturn = /^(?:regresa|regresemos|vuelve|volvamos)\b/.test(core);
  if (!startsNav && !startsReturn) return null;
  if (!SHEET_NOUN_RE.test(core) && !startsReturn) return null;

  const details = extractOpenDetails(core);
  if (startsReturn && !details.query && !SHEET_NOUN_RE.test(core)) return null;
  if (startsReturn && !details.query && !details.other) return { type: "back" };
  return { type: "open", ...details };
}

export function rememberOpenedPlan(
  history: string[],
  currentPlanId: string | undefined,
  nextPlanId: string
): string[] {
  if (!nextPlanId || currentPlanId === nextPlanId) return history.slice(-COSMOS_PLAN_SHEET_HISTORY_LIMIT);
  const next = history.slice(-COSMOS_PLAN_SHEET_HISTORY_LIMIT);
  if (next[next.length - 1] === nextPlanId) {
    next.pop();
    return next;
  }
  if (currentPlanId && next[next.length - 1] !== currentPlanId) next.push(currentPlanId);
  return next.slice(-COSMOS_PLAN_SHEET_HISTORY_LIMIT);
}

function scorePlan(query: string, plan: PlanSheetCatalogPlan): number {
  const q = normalizePlanSheetText(query);
  const name = normalizePlanSheetText(plan.name);
  const country = normalizePlanSheetText(plan.country);
  if (!q) return 0;
  if (name === q) return 100;
  if (name.includes(q)) return 80;
  if (q.includes(name) && name.length > 4) return 70;
  if (country === q) return 55;
  if (country.includes(q) && q.length > 3) return 45;
  let score = 0;
  for (const word of q.split(/\s+/).filter((w) => w.length > 3)) {
    if (name.includes(word)) score += 15;
    if (country.includes(word)) score += 8;
  }
  return score;
}

export function pickPlanSheetMatches(
  query: string,
  catalog: PlanSheetCatalogPlan[]
): PlanSheetCatalogPlan[] {
  const scored = catalog
    .map((plan) => ({ plan, score: scorePlan(query, plan) }))
    .filter((row) => row.score >= 15)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return [];
  const best = scored[0].score;
  const close = scored.filter((row) => best - row.score < 10);
  if (close.length > 1 && best < 100) return close.slice(0, 4).map((row) => row.plan);
  return [scored[0].plan];
}

function planName(catalog: PlanSheetCatalogPlan[], id: string): string {
  return catalog.find((plan) => plan.id === id)?.name ?? "ese programa";
}

function listNames(catalog: PlanSheetCatalogPlan[], ids: string[]): string {
  const names = ids.map((id) => planName(catalog, id)).filter((name) => name !== "ese programa");
  return names.join(", ");
}

function openTurn(
  plan: PlanSheetCatalogPlan,
  screen: CosmosScreenContext | undefined
): PlanSheetTurn {
  return {
    reply: `Te llevo a la ficha técnica de ${plan.name}.`,
    action: { type: "open_plan", planId: plan.id },
    screenPatch: {
      planId: plan.id,
      path: `/plan/${plan.id}`,
      planSheetHistory: rememberOpenedPlan(screen?.planSheetHistory ?? [], screen?.planId, plan.id),
    },
  };
}

export function resolvePlanSheetTurnFromCatalog(
  message: string,
  screen: CosmosScreenContext | undefined,
  catalog: PlanSheetCatalogPlan[]
): PlanSheetTurn | null {
  const intent = parsePlanSheetIntent(message);
  if (!intent) return null;

  if (intent.type === "back") {
    const history = [...(screen?.planSheetHistory ?? [])];
    const previousId = history.pop();
    if (!previousId) return null;
    const name = planName(catalog, previousId);
    return {
      reply: `Volvemos a la ficha técnica de ${name}.`,
      action: { type: "open_plan", planId: previousId },
      screenPatch: {
        planId: previousId,
        path: `/plan/${previousId}`,
        planSheetHistory: history,
      },
    };
  }

  if (intent.query) {
    const matches = pickPlanSheetMatches(intent.query, catalog);
    if (!matches.length) {
      return { reply: "No encontré ese programa. Dime el nombre del plan y te abro la ficha técnica." };
    }
    if (matches.length > 1) {
      return {
        reply: `Encontré varios: ${matches.map((plan) => plan.name).join(", ")}. ¿Cuál ficha técnica abro?`,
      };
    }
    const chosen = matches[0];
    if (screen?.planId === chosen.id) {
      return alreadyOnSheet(chosen.name, intent.focus);
    }
    return openTurn(chosen, screen);
  }

  const current = screen?.planId;
  const draftIds = screen?.quoteDraft?.planIds ?? [];
  const others = draftIds.filter((id) => id !== current);

  if (intent.other) {
    if (others.length === 1) {
      const plan = catalog.find((item) => item.id === others[0]);
      if (plan) return openTurn(plan, screen);
    }
    const listed = listNames(catalog, others.length ? others : draftIds);
    return {
      reply: listed
        ? `¿A cuál programa te llevo? Puedo abrir la ficha de ${listed}.`
        : "¿A cuál programa te llevo? Dime el nombre y abro su ficha técnica.",
    };
  }

  if (current) return alreadyOnSheet(planName(catalog, current), intent.focus);

  if (draftIds.length === 1) {
    const plan = catalog.find((item) => item.id === draftIds[0]);
    if (plan) return openTurn(plan, screen);
  }
  if (draftIds.length > 1) {
    const listed = listNames(catalog, draftIds);
    return {
      reply: listed
        ? `¿A cuál programa te llevo? Puedo abrir la ficha de ${listed}.`
        : "¿A cuál programa te llevo? Dime el nombre y abro su ficha técnica.",
    };
  }
  return { reply: "¿A cuál programa te llevo? Dime el nombre y abro su ficha técnica." };
}

function alreadyOnSheet(name: string, focus: PlanSheetFocus): PlanSheetTurn {
  if (focus === "itinerary") {
    return {
      reply: `Ya estás en la ficha técnica de ${name}. Te señalo el itinerario.`,
      action: { type: "highlight", target: "plan.itinerary" },
    };
  }
  return { reply: `Ya estás en la ficha técnica de ${name}.` };
}
