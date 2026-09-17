import { describe, expect, it } from "vitest";
import { resolveCosmosNavigation } from "../cosmosNavigation";

describe("resolveCosmosNavigation", () => {
  const agency = { role: "agency", enabledModules: { quote: true, academy: true, dayCounter: true } };

  it("lleva a la academia si el módulo está activo", () => {
    expect(resolveCosmosNavigation("academy", agency)).toEqual({
      ok: true,
      path: "/tutoriales",
      title: "Academia digital",
    });
  });

  it("bloquea millas si no hay acceso", () => {
    const result = resolveCosmosNavigation("miles", { role: "agency", enabledModules: { milesCalculator: false } });
    expect(result.ok).toBe(false);
  });

  it("no deja a una agencia entrar a usuarios", () => {
    const result = resolveCosmosNavigation("admin_users", agency);
    expect(result.ok).toBe(false);
  });

  it("arma la ficha de un plan", () => {
    const planId = "11111111-1111-4111-8111-111111111111";
    expect(resolveCosmosNavigation("plan", agency, { planId })).toEqual({
      ok: true,
      path: `/plan/${planId}`,
      title: "Ficha del plan",
    });
  });
});
