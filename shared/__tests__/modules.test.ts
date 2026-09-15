import { describe, expect, it } from "vitest";
import { ROLES } from "../roles";
import {
  canAccessMilesCalculator,
  canAccessModule,
  defaultEnabledModulesForRole,
  normalizeEnabledModules,
  reconcileMilesModuleAccess,
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

describe("defaultEnabledModulesForRole", () => {
  it("apaga academia solo para proveedores", () => {
    expect(defaultEnabledModulesForRole(ROLES.PROVIDER).academy).toBe(false);
    expect(defaultEnabledModulesForRole(ROLES.AGENCY).academy).toBe(true);
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
