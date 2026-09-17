import { describe, expect, it } from "vitest";
import { ROLES } from "../roles";
import {
  canAccessCosmos,
  canAccessCosmosVoice,
  canAccessMilesCalculator,
  canAccessModule,
  defaultEnabledModulesForRole,
  normalizeEnabledModules,
  reconcileCosmosModuleAccess,
  reconcileMilesModuleAccess,
  resolveUserModuleId,
  resolveUserModuleIds,
  USER_MODULES,
} from "../modules";

describe("normalizeEnabledModules", () => {
  it("deja todos encendidos si el valor es nulo o inválido", () => {
    expect(normalizeEnabledModules(null).quote).toBe(true);
    expect(normalizeEnabledModules(undefined).academy).toBe(true);
    expect(normalizeEnabledModules("nope").dayCounter).toBe(true);
  });

  it("solo apaga las claves explícitamente en false", () => {
    const mods = normalizeEnabledModules({ quote: false, academy: true });
    expect(mods.quote).toBe(false);
    expect(mods.quoteExpress).toBe(true);
    expect(mods.academy).toBe(true);
  });

  it("deja Cosmos apagado si la clave no existe (opt-in)", () => {
    const mods = normalizeEnabledModules({ quote: true });
    expect(mods.cosmos).toBe(false);
    expect(mods.cosmosVoice).toBe(false);
  });

  it("respeta Cosmos y voz cuando vienen explícitos en true", () => {
    const mods = normalizeEnabledModules({ cosmos: true, cosmosVoice: true });
    expect(mods.cosmos).toBe(true);
    expect(mods.cosmosVoice).toBe(true);
  });

  it("apaga la voz si Cosmos está apagado", () => {
    const mods = normalizeEnabledModules({ cosmos: false, cosmosVoice: true });
    expect(mods.cosmos).toBe(false);
    expect(mods.cosmosVoice).toBe(false);
  });
});

describe("canAccessModule", () => {
  it("el super admin siempre tiene acceso", () => {
    expect(
      canAccessModule(
        { role: ROLES.SUPER_ADMIN, enabledModules: { quote: false, academy: false } },
        USER_MODULES.QUOTE,
      ),
    ).toBe(true);
  });

  it("respeta el switch del usuario", () => {
    const user = { role: ROLES.AGENCY, enabledModules: { academy: false, quoteExpress: true } };
    expect(canAccessModule(user, USER_MODULES.ACADEMY)).toBe(false);
    expect(canAccessModule(user, USER_MODULES.QUOTE_EXPRESS)).toBe(true);
  });
});

describe("canAccessMilesCalculator", () => {
  it("exige módulo y al menos un programa", () => {
    const user = {
      role: ROLES.AGENCY,
      enabledModules: { milesCalculator: true },
      milesProgramsAllowed: "none",
    };
    expect(canAccessMilesCalculator(user)).toBe(false);
    expect(canAccessMilesCalculator({ ...user, milesProgramsAllowed: "smiles" })).toBe(true);
    expect(
      canAccessMilesCalculator({
        ...user,
        enabledModules: { milesCalculator: false },
        milesProgramsAllowed: "both",
      }),
    ).toBe(false);
  });
});

describe("cosmos access", () => {
  it("el super admin siempre tiene chat y voz", () => {
    const user = { role: ROLES.SUPER_ADMIN, enabledModules: { cosmos: false, cosmosVoice: false } };
    expect(canAccessCosmos(user)).toBe(true);
    expect(canAccessCosmosVoice(user)).toBe(true);
  });

  it("exige el módulo Cosmos para el chat", () => {
    const user = { role: ROLES.AGENCY, enabledModules: { cosmos: false } };
    expect(canAccessCosmos(user)).toBe(false);
    expect(canAccessCosmos({ ...user, enabledModules: { cosmos: true } })).toBe(true);
  });

  it("la voz exige Cosmos y el switch de voz", () => {
    const base = { role: ROLES.AGENCY };
    expect(canAccessCosmosVoice({ ...base, enabledModules: { cosmos: true, cosmosVoice: false } })).toBe(false);
    expect(canAccessCosmosVoice({ ...base, enabledModules: { cosmos: false, cosmosVoice: true } })).toBe(false);
    expect(canAccessCosmosVoice({ ...base, enabledModules: { cosmos: true, cosmosVoice: true } })).toBe(true);
  });
});

describe("reconcileCosmosModuleAccess", () => {
  it("no deja voz encendida sin Cosmos", () => {
    const result = reconcileCosmosModuleAccess({
      ...defaultEnabledModulesForRole(ROLES.AGENCY),
      cosmos: false,
      cosmosVoice: true,
    });
    expect(result.cosmos).toBe(false);
    expect(result.cosmosVoice).toBe(false);
  });
});

describe("defaultEnabledModulesForRole", () => {
  it("apaga academia solo para proveedores", () => {
    expect(defaultEnabledModulesForRole(ROLES.PROVIDER).academy).toBe(false);
    expect(defaultEnabledModulesForRole(ROLES.AGENCY).academy).toBe(true);
  });

  it("deja Cosmos apagado para agencias y proveedores", () => {
    expect(defaultEnabledModulesForRole(ROLES.AGENCY).cosmos).toBe(false);
    expect(defaultEnabledModulesForRole(ROLES.AGENCY).cosmosVoice).toBe(false);
    expect(defaultEnabledModulesForRole(ROLES.PROVIDER).cosmos).toBe(false);
  });
});

describe("reconcileMilesModuleAccess", () => {
  it("apaga el módulo si no hay calculadoras", () => {
    const result = reconcileMilesModuleAccess(
      { ...defaultEnabledModulesForRole(ROLES.AGENCY), milesCalculator: true },
      "none",
    );
    expect(result.enabledModules.milesCalculator).toBe(false);
    expect(result.milesProgramsAllowed).toBe("none");
  });

  it("no reenciende el módulo solo porque hay programas guardados", () => {
    const result = reconcileMilesModuleAccess(
      { ...defaultEnabledModulesForRole(ROLES.AGENCY), milesCalculator: false },
      "both",
    );
    expect(result.enabledModules.milesCalculator).toBe(false);
    expect(result.milesProgramsAllowed).toBe("both");
  });
});

describe("resolveUserModuleId", () => {
  it("entiende nombres técnicos y alias en español", () => {
    expect(resolveUserModuleId("academia")).toBe(USER_MODULES.ACADEMY);
    expect(resolveUserModuleId("Cotización")).toBe(USER_MODULES.QUOTE);
    expect(resolveUserModuleId("cotizador express")).toBe(USER_MODULES.QUOTE_EXPRESS);
    expect(resolveUserModuleId("contador de días")).toBe(USER_MODULES.DAY_COUNTER);
    expect(resolveUserModuleId("millas")).toBe(USER_MODULES.MILES_CALCULATOR);
    expect(resolveUserModuleId("cosmos voz")).toBe(USER_MODULES.COSMOS_VOICE);
    expect(resolveUserModuleId("voz")).toBe(USER_MODULES.COSMOS_VOICE);
    expect(resolveUserModuleId("no-existe")).toBeNull();
  });

  it("deduplica y reporta desconocidos", () => {
    expect(resolveUserModuleIds(["cosmos", "asistente", "xyz"])).toEqual({
      ids: [USER_MODULES.COSMOS],
      unknown: ["xyz"],
    });
  });
});
