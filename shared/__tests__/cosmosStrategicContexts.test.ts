import { describe, expect, it } from "vitest";
import { pickRelevantStrategicContexts } from "../cosmosStrategicContexts";

const contexts = [
  {
    id: "1",
    name: "Turquía",
    kind: "destination" as const,
    destinationId: "plan-tr",
    pinned: false,
  },
  {
    id: "2",
    name: "Paseo en globo",
    kind: "activity" as const,
    destinationId: null,
    pinned: false,
  },
  {
    id: "3",
    name: "Contexto general",
    kind: "destination" as const,
    destinationId: null,
    pinned: true,
  },
];

describe("pickRelevantStrategicContexts", () => {
  it("incluye el contexto del plan vinculado y los prioritarios", () => {
    const picked = pickRelevantStrategicContexts(contexts, "¿cuál es el precio?", ["plan-tr"]);
    expect(picked.map((ctx) => ctx.id)).toEqual(["3", "1"]);
  });

  it("incluye una actividad cuando el nombre aparece en la pregunta", () => {
    const picked = pickRelevantStrategicContexts(contexts, "quiero el paseo en globo", []);
    expect(picked.map((ctx) => ctx.id)).toContain("2");
    expect(picked.map((ctx) => ctx.id)).toContain("3");
  });

  it("incluye el contexto del plan cuando preguntan por su país", () => {
    const picked = pickRelevantStrategicContexts(
      contexts.filter((ctx) => ctx.id === "1"),
      "qué incluye el viaje a turquía",
      [],
      [{ id: "plan-tr", name: "Turquía Esencial", country: "Turquía" }]
    );
    expect(picked.map((ctx) => ctx.id)).toEqual(["1"]);
  });

  it("omite contextos que no coinciden", () => {
    const picked = pickRelevantStrategicContexts(
      contexts.filter((ctx) => !ctx.pinned),
      "háblame de Egipto",
      []
    );
    expect(picked).toEqual([]);
  });
});
