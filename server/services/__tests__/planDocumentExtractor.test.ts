import { describe, expect, it } from "vitest";
import { normalizeExtractedPlan } from "../planDocumentExtractor";

describe("normalizeExtractedPlan", () => {
  it("conserva la descripción larga del plan y el detalle del día", () => {
    const description = "Párrafo original del PDF. ".repeat(40);
    const dayDetail =
      "08:50 Recojo en el hotel y traslado al aeropuerto. Visita completa al museo con guía en español y tiempo libre en el centro histórico hasta el regreso.";
    const plan = normalizeExtractedPlan({
      name: "Tour El Cairo",
      country: "Egipto",
      duration: 4,
      nights: 3,
      description,
      itinerary: [
        {
          dayNumber: 1,
          title: "El Cairo",
          description: dayDetail,
          activities: ["08:50 - Recojo"],
        },
      ],
    });

    expect(plan.description).toBe(description.trim());
    expect(plan.description.length).toBeGreaterThan(300);
    expect(plan.itinerary[0].description).toBe(dayDetail);
  });
});
