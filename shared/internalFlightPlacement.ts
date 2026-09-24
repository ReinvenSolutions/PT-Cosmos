import { connectionSegmentCardTitle } from "./quoteCombination";

export type InternalFlightLike = {
  imageUrl?: string | null;
  flightRole?: "outbound" | "return" | "domestic" | string | null;
};

export type PlanInternalFlightHints = {
  hasInternalOrConnectionFlight?: boolean | null;
  isBloqueo?: boolean | null;
  internalFlights?: InternalFlightLike[] | null;
  internalFlightAfterDay?: number | null;
  duration?: number | null;
};

/** El plan pide (o ya tiene) un vuelo interno que debe ir dentro del itinerario. */
export function planHasInternalFlightSlot(plan: PlanInternalFlightHints): boolean {
  if (plan.hasInternalOrConnectionFlight) return true;
  return (plan.internalFlights ?? []).some(
    (flight) => flight.flightRole === "domestic" && Boolean(flight.imageUrl?.trim()),
  );
}

/** Hay que exigir «después del día N» al guardar el plan. */
export function planNeedsInternalFlightAfterDay(plan: PlanInternalFlightHints): boolean {
  return planHasInternalFlightSlot(plan);
}

/** Imágenes por defecto del interno: solo bloqueo (rol domestic). En planes normales se suben al cotizar. */
export function defaultInternalImagesForPlan(plan: PlanInternalFlightHints): string[] {
  if (!plan.isBloqueo) return [];
  return (plan.internalFlights ?? [])
    .filter((flight) => flight.flightRole === "domestic" && flight.imageUrl?.trim())
    .map((flight) => flight.imageUrl!.trim());
}

/**
 * Día del itinerario después del cual se inserta el interno.
 * Si el valor no es válido, cae en el último día para no perder las fotos.
 */
export function clampInternalFlightAfterDay(
  afterDay: number | null | undefined,
  itineraryDayCount: number,
): number | null {
  if (itineraryDayCount <= 0) return null;
  if (afterDay == null || !Number.isFinite(Number(afterDay))) return itineraryDayCount;
  const day = Math.trunc(Number(afterDay));
  if (day < 1) return 1;
  if (day > itineraryDayCount) return itineraryDayCount;
  return day;
}

export function shouldInsertInternalFlightAfterDay(opts: {
  dayNumber: number;
  dayIndex: number;
  itineraryLength: number;
  afterDay: number | null;
  hasImages: boolean;
  itineraryDayNumbers: number[];
}): boolean {
  const { dayNumber, dayIndex, itineraryLength, afterDay, hasImages, itineraryDayNumbers } = opts;
  if (!hasImages || afterDay == null || itineraryLength <= 0) return false;
  if (dayNumber === afterDay) return true;
  const hasExact = itineraryDayNumbers.includes(afterDay);
  const isLast = dayIndex === itineraryLength - 1;
  return !hasExact && isLast;
}

export function resolveDomesticImagesForDestination(
  destId: string,
  destIds: string[],
  byDestination: Record<string, string[]> | null | undefined,
  legacyDomestic: string[] | null | undefined,
): string[] {
  const fromMap = byDestination?.[destId];
  if (fromMap && fromMap.length > 0) return fromMap;
  const firstId = destIds[0];
  if (destId === firstId && legacyDomestic && legacyDomestic.length > 0) {
    return legacyDomestic;
  }
  return [];
}

export function remapDomesticImagesByDestination(
  previous: Record<string, string[]>,
  nextDestIds: string[],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const id of nextDestIds) {
    if (previous[id]?.length) out[id] = [...previous[id]];
    else if (id in previous) out[id] = [...(previous[id] ?? [])];
  }
  return out;
}

export function flattenDomesticImagesByDestination(
  byDestination: Record<string, string[]> | null | undefined,
): string[] {
  if (!byDestination) return [];
  return Object.values(byDestination).flatMap((urls) => urls.filter(Boolean));
}

export function internalFlightPdfHeading(planLabel: string, isCombo: boolean): string {
  const name = (planLabel || "").trim();
  if (!isCombo || !name) return "VUELO INTERNO";
  return `VUELO INTERNO — ${name.toUpperCase()}`;
}

export type QuoteFlightUploadStep =
  | { kind: "outbound"; step: number; title: string }
  | {
      kind: "internal";
      step: number;
      title: string;
      destId: string;
      destName: string;
      afterDay: number | null;
    }
  | { kind: "connection"; step: number; title: string; segmentIndex: number }
  | { kind: "return"; step: number; title: string };

/** Ruta de carga de vuelos en cotización, en el orden del viaje. Cambia si se reordenan o quitan planes. */
export function buildQuoteFlightUploadSteps(
  dests: Array<PlanInternalFlightHints & { id: string; name: string }>,
): QuoteFlightUploadStep[] {
  const steps: QuoteFlightUploadStep[] = [];
  let step = 1;
  steps.push({ kind: "outbound", step: step++, title: "Vuelo de ida" });

  const names = dests.map((dest) => dest.name);
  dests.forEach((dest, index) => {
    if (planHasInternalFlightSlot(dest)) {
      const destName = (dest.name || "").trim() || "Plan";
      steps.push({
        kind: "internal",
        step: step++,
        title: `Vuelo interno del plan ${destName}`,
        destId: dest.id,
        destName,
        afterDay: dest.internalFlightAfterDay ?? null,
      });
    }
    if (index < dests.length - 1) {
      const pairLabel = connectionSegmentCardTitle(names, index).replace(/^Conexión\s+/i, "");
      steps.push({
        kind: "connection",
        step: step++,
        title: `Vuelo de conexión — ${pairLabel}`,
        segmentIndex: index,
      });
    }
  });

  steps.push({ kind: "return", step: step++, title: "Vuelo de regreso" });
  return steps;
}
