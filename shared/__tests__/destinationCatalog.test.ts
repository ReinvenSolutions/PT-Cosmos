import { describe, expect, it } from "vitest";
import {
  hotelStarsFromCategories,
  mealsFromItinerary,
  parseHotelCategoryToStars,
  toDestinationCardPreview,
  toQuoteCatalogDestination,
} from "../destinationCatalog";
import type { Destination } from "../schema";

describe("destinationCatalog", () => {
  it("parsea categorías de hotel a estrellas", () => {
    expect(parseHotelCategoryToStars("5*")).toBe(5);
    expect(parseHotelCategoryToStars("4 estrellas")).toBe(4);
    expect(parseHotelCategoryToStars("3 stars")).toBe(3);
    expect(parseHotelCategoryToStars(null)).toBeNull();
  });

  it("usa 4 estrellas si no hay categoría reconocible", () => {
    expect(hotelStarsFromCategories([])).toBe(4);
    expect(hotelStarsFromCategories(["Superior"])).toBe(4);
    expect(hotelStarsFromCategories(["5*", "3*"])).toBe(5);
  });

  it("cuenta comidas del itinerario y rellena desayunos con noches", () => {
    expect(mealsFromItinerary(7, [])).toEqual({ breakfasts: 7, lunches: 0, dinners: 0, total: 7 });
    expect(
      mealsFromItinerary(3, [
        { meals: ["Desayuno", "Almuerzo"] },
        { meals: ["Cena"] },
      ]),
    ).toEqual({ breakfasts: 1, lunches: 1, dinners: 1, total: 3 });
  });

  it("arma un preview sin priceTiers ni hoteles completos", () => {
    const preview = toDestinationCardPreview(
      {
        id: "1",
        name: "Cusco",
        country: "Perú",
        duration: 4,
        nights: 3,
        imageUrl: "https://example.com/1.jpg",
        basePrice: "900",
        category: "internacional",
        isBloqueo: false,
        bloqueoSalidaFecha: null,
        bloqueoCuposDisponibles: null,
        agencyDisplayName: null,
        cardTooltip: "Salidas diarias",
        priceTiers: [{ endDate: "2026-12-31", price: "990" }],
      },
      [{ category: "4*" }],
      [{ meals: ["Desayuno"] }],
    );
    expect(preview.hotelStars).toBe(4);
    expect(preview.hasDynamicPricing).toBe(true);
    expect(preview.meals.breakfasts).toBe(1);
    expect(preview).not.toHaveProperty("priceTiers");
    expect(preview).not.toHaveProperty("hotels");
  });

  it("quita campos pesados del catálogo de cotización", () => {
    const dest = {
      id: "1",
      name: "Cusco",
      country: "Perú",
      duration: 4,
      nights: 3,
      description: "<p>texto largo</p>",
      termsConditions: "lorem",
      recommendations: "ipsum",
      hotelGalleryImageUrls: ["https://x/1.jpg"],
      cosmosAssistantNotes: "interno",
      basePrice: "900",
      priceTiers: [{ endDate: "2026-12-31", price: "990" }],
    } as unknown as Destination;

    const slim = toQuoteCatalogDestination(dest);
    expect(slim.basePrice).toBe("900");
    expect(slim.priceTiers).toEqual([{ endDate: "2026-12-31", price: "990" }]);
    expect(slim).not.toHaveProperty("description");
    expect(slim).not.toHaveProperty("termsConditions");
    expect(slim).not.toHaveProperty("hotelGalleryImageUrls");
    expect(slim).not.toHaveProperty("cosmosAssistantNotes");
  });
});
