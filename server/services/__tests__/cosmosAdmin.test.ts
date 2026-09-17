import { describe, expect, it } from "vitest";
import { DEFAULT_ENABLED_MODULES } from "@shared/modules";
import { formatModulesList, percentChangeLabel } from "../cosmosAdmin";
import { executeCosmosTool, openaiCosmosToolsForRole } from "../cosmosTools";

describe("percentChangeLabel", () => {
  it("describe subidas, bajas y casos vacíos", () => {
    expect(percentChangeLabel(12, 10)).toBe("+20% vs periodo anterior");
    expect(percentChangeLabel(8, 10)).toBe("-20% vs periodo anterior");
    expect(percentChangeLabel(5, 0)).toBe("nuevo");
    expect(percentChangeLabel(0, 0)).toBe("sin cambio");
  });
});

describe("formatModulesList", () => {
  it("incluye voz junto a Cosmos y el programa de millas", () => {
    const text = formatModulesList(
      { ...DEFAULT_ENABLED_MODULES, cosmos: true, cosmosVoice: true, milesCalculator: true },
      "lifemiles"
    );
    expect(text).toMatch(/Cosmos asistente: sí · voz: sí/);
    expect(text).toMatch(/Calculadora de millas: sí \(lifemiles\)/);
    expect(text).toMatch(/Academia: sí/);
  });
});

describe("openaiCosmosToolsForRole", () => {
  it("oculta stats y módulos a agencias", () => {
    const names = openaiCosmosToolsForRole("agency").map((t) => t.function.name);
    expect(names).not.toContain("get_dashboard_stats");
    expect(names).not.toContain("set_user_modules");
    expect(names).not.toContain("set_plan_active");
    expect(names).toContain("search_plans");
  });

  it("da inventario al proveedor y stats solo al admin", () => {
    const provider = openaiCosmosToolsForRole("provider").map((t) => t.function.name);
    expect(provider).toContain("set_plan_active");
    expect(provider).toContain("search_managed_plans");
    expect(provider).not.toContain("set_user_modules");
    expect(provider).not.toContain("get_dashboard_stats");

    const admin = openaiCosmosToolsForRole("super_admin").map((t) => t.function.name);
    expect(admin).toContain("get_dashboard_stats");
    expect(admin).toContain("set_user_modules");
    expect(admin).toContain("set_plan_active");
  });
});

describe("executeCosmosTool auth admin", () => {
  const agency = { userId: "11111111-1111-4111-8111-111111111111", userRole: "agency" };

  it("niega stats y módulos a una agencia", async () => {
    expect((await executeCosmosTool("get_dashboard_stats", {}, agency)).result).toMatch(/administrador/);
    expect((await executeCosmosTool("set_user_modules", { user: "ana", enable: ["cosmos"] }, agency)).result).toMatch(
      /administrador/
    );
  });

  it("niega activar planes a una agencia", async () => {
    expect(
      (await executeCosmosTool("set_plan_active", { plan: "Turquía", active: false }, agency)).result
    ).toMatch(/administrador o un proveedor/);
  });
});
