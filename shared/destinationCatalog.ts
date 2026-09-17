import type { Destination, Hotel, ItineraryDay } from "./schema";

export type DestinationMealsPreview = {
  breakfasts: number;
  lunches: number;
  dinners: number;
  total: number;
};

/** Payload liviano de la home: sin itinerarios, galerías ni textos largos de PDF. */
export type DestinationCardPreview = {
  id: string;
  name: string;
  country: string;
  duration: number;
  nights: number;
  imageUrl: string | null;
  basePrice: string | null;
  category: string | null;
  isBloqueo: boolean | null;
  bloqueoSalidaFecha: string | null;
  bloqueoCuposDisponibles: number | null;
  agencyDisplayName: string | null;
  cardTooltip: string | null;
  hasDynamicPricing: boolean;
  hotelStars: number;
  meals: DestinationMealsPreview;
};

const QUOTE_CATALOG_OMIT = new Set([
  "cosmosAssistantNotes",
  "medicalAssistanceInfo",
  "medicalAssistanceImageUrl",
  "firstPageComments",
  "itineraryMapImageUrl",
  "descriptiveAudioUrl",
  "hotelGalleryImageUrls",
  "adicionalesGalleryImageUrls",
  "flightTerms",
  "termsConditions",
  "recommendations",
  "description",
]);

export function parseHotelCategoryToStars(category: string | null | undefined): number | null {
  if (!category?.trim()) return null;
  const s = category.trim().toLowerCase();
  const asteriskMatch = s.match(/^(\d)\s*\*?$/);
  if (asteriskMatch) return Math.min(5, Math.max(1, parseInt(asteriskMatch[1], 10)));
  const wordMatch = s.match(/(\d)\s*(?:estrellas?|stars?)/);
  if (wordMatch) return Math.min(5, Math.max(1, parseInt(wordMatch[1], 10)));
  const inlineMatch = s.match(/(\d)\s*\*/);
  if (inlineMatch) return Math.min(5, Math.max(1, parseInt(inlineMatch[1], 10)));
  return null;
}

export function hotelStarsFromCategories(categories: Array<string | null | undefined>): number {
  const starCounts = categories
    .map((category) => parseHotelCategoryToStars(category))
    .filter((n): n is number => n !== null);
  if (starCounts.length === 0) return 4;
  return Math.max(...starCounts, 1);
}

export function mealsFromItinerary(
  nights: number,
  days: Array<{ meals?: string[] | null }>,
): DestinationMealsPreview {
  if (!days.length) {
    return { breakfasts: nights, lunches: 0, dinners: 0, total: nights };
  }

  let breakfasts = 0;
  let lunches = 0;
  let dinners = 0;

  for (const day of days) {
    if (!day.meals || !Array.isArray(day.meals)) continue;
    for (const meal of day.meals) {
      const lowerMeal = meal.toLowerCase();
      if (lowerMeal.includes("desayuno") || lowerMeal.includes("breakfast")) breakfasts++;
      if (lowerMeal.includes("almuerzo") || lowerMeal.includes("lunch")) lunches++;
      if (lowerMeal.includes("cena") || lowerMeal.includes("dinner")) dinners++;
    }
  }

  if (breakfasts === 0 && nights) breakfasts = nights;

  return { breakfasts, lunches, dinners, total: breakfasts + lunches + dinners };
}

export function toDestinationCardPreview(
  dest: Pick<
    Destination,
    | "id"
    | "name"
    | "country"
    | "duration"
    | "nights"
    | "imageUrl"
    | "basePrice"
    | "category"
    | "isBloqueo"
    | "bloqueoSalidaFecha"
    | "bloqueoCuposDisponibles"
    | "agencyDisplayName"
    | "cardTooltip"
    | "priceTiers"
  >,
  hotels: Array<Pick<Hotel, "category">>,
  itinerary: Array<Pick<ItineraryDay, "meals">>,
): DestinationCardPreview {
  const nights = dest.nights || 0;
  return {
    id: dest.id,
    name: dest.name,
    country: dest.country,
    duration: dest.duration,
    nights,
    imageUrl: dest.imageUrl ?? null,
    basePrice: dest.basePrice ?? null,
    category: dest.category ?? null,
    isBloqueo: dest.isBloqueo ?? null,
    bloqueoSalidaFecha: dest.bloqueoSalidaFecha ?? null,
    bloqueoCuposDisponibles: dest.bloqueoCuposDisponibles ?? null,
    agencyDisplayName: dest.agencyDisplayName ?? null,
    cardTooltip: dest.cardTooltip ?? null,
    hasDynamicPricing: Array.isArray(dest.priceTiers) && dest.priceTiers.length > 0,
    hotelStars: hotelStarsFromCategories(hotels.map((h) => h.category)),
    meals: mealsFromItinerary(nights, itinerary),
  };
}

/** Catálogo de cotización: quita HTML/galerías/audio que la home y el cotizador no necesitan. */
export function toQuoteCatalogDestination<T extends Destination>(destination: T): Omit<T, never> {
  const slim = { ...destination } as Record<string, unknown>;
  for (const key of Array.from(QUOTE_CATALOG_OMIT)) {
    delete slim[key];
  }
  return slim as T;
}

export function toQuoteCatalogDestinationList<T extends Destination>(destinations: T[]): T[] {
  return destinations.map((d) => toQuoteCatalogDestination(d));
}
