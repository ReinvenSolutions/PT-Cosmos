import { describe, expect, it } from "vitest";
import { matchCatalogActivities } from "../cosmosKnowledge";

const catalog = [
  {
    id: "egipto",
    name: "Egipto clásico",
    country: "Egipto",
    recommendations: "Lleva ropa ligera y zapatos cómodos para las pirámides.",
  },
  {
    id: "turquia",
    name: "Turquía esencial",
    country: "Turquía",
    recommendations: "En Capadocia reserva el globo con anticipación. Lleva abrigo al amanecer.",
  },
];

const days = [
  {
    destinationId: "egipto",
    dayNumber: 2,
    title: "El Cairo",
    location: "Giza",
    activities: ["Visita a las pirámides"],
    description: "Mañana en la meseta de Giza.",
  },
  {
    destinationId: "turquia",
    dayNumber: 4,
    title: "Capadocia",
    location: "Göreme",
    activities: ["Paseo en globo", "Valle de las chimeneas"],
    description: "Amanecer en globo sobre los valles.",
  },
];

describe("matchCatalogActivities", () => {
  it("encuentra actividades de otro plan aunque no sea el de pantalla", () => {
    const match = matchCatalogActivities({
      query: "qué actividades hay en Capadocia",
      catalog,
      days,
    });
    expect(match.planIds).toEqual(["turquia"]);
    expect(match.text).toMatch(/Paseo en globo/);
    expect(match.text).toMatch(/reserva el globo/);
    expect(match.text).not.toMatch(/pirámides/);
  });

  it("devuelve recomendaciones y actividades de un plan concreto", () => {
    const match = matchCatalogActivities({
      query: "recomendaciones",
      catalog,
      days,
      onlyPlanId: "egipto",
    });
    expect(match.planIds).toEqual(["egipto"]);
    expect(match.text).toMatch(/ropa ligera/);
    expect(match.text).toMatch(/Visita a las pirámides/);
  });
});
