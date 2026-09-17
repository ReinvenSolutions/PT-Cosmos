import { describe, expect, it } from "vitest";
import {
  applySelectedUpgradesMap,
  formatUpgradeChoices,
  matchPlanUpgrade,
  TURKEY_FALLBACK_UPGRADES,
  upgradesForPlan,
} from "../cosmosQuoteUpgrades";

const italia = [
  { code: "rome_hotel", name: "Hotel 4 estrellas en Roma", description: "Upgrade de hotel", price: 180 },
  { code: "venice_tour", name: "Tour extra en Venecia", price: 95 },
];

describe("matchPlanUpgrade", () => {
  it("elige la única mejora si no hay query", () => {
    expect(matchPlanUpgrade(italia.slice(0, 1), "")?.code).toBe("rome_hotel");
  });

  it("no adivina si hay varias y no hay query", () => {
    expect(matchPlanUpgrade(italia, "")).toBeNull();
  });

  it("resuelve por código, nombre, precio u opción numerada", () => {
    expect(matchPlanUpgrade(italia, "rome_hotel")?.code).toBe("rome_hotel");
    expect(matchPlanUpgrade(italia, "venecia")?.code).toBe("venice_tour");
    expect(matchPlanUpgrade(italia, "95 usd")?.code).toBe("venice_tour");
    expect(matchPlanUpgrade(TURKEY_FALLBACK_UPGRADES, "opcion 2")?.code).toBe("option2");
    expect(matchPlanUpgrade(TURKEY_FALLBACK_UPGRADES, "hotel cueva")?.code).toBe("option3");
  });
});

describe("upgradesForPlan", () => {
  it("usa el fallback de Turquía Esencial si no hay lista", () => {
    expect(upgradesForPlan({ name: "Turquía Esencial", upgrades: [] })).toHaveLength(3);
    expect(upgradesForPlan({ name: "Italia Turística - Euro Express", upgrades: [] })).toHaveLength(0);
  });
});

describe("applySelectedUpgradesMap", () => {
  it("reparte por tipo de plan", () => {
    const turkeyId = "11111111-1111-4111-8111-111111111111";
    const otherId = "22222222-2222-4222-8222-222222222222";
    const applied = applySelectedUpgradesMap(
      { [turkeyId]: "option1", [otherId]: "rome_hotel" },
      [
        { id: turkeyId, name: "Turquía Esencial" },
        { id: otherId, name: "Italia Bella" },
      ]
    );
    expect(applied.turkeyUpgrade).toBe("option1");
    expect(applied.otherDestUpgrades[otherId]).toBe("rome_hotel");
  });
});

describe("formatUpgradeChoices", () => {
  it("lista código, nombre y precio", () => {
    expect(formatUpgradeChoices(italia)).toMatch(/\[rome_hotel\] Hotel 4 estrellas/);
  });
});
