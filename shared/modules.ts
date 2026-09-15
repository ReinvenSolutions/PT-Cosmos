import { ROLES } from "./roles";
import {
  canUseMilesCalculator,
  normalizeMilesProgramsAllowed,
  type MilesProgramsAllowed,
} from "./milesCalculator";

export const USER_MODULES = {
  QUOTE: "quote",
  QUOTE_EXPRESS: "quoteExpress",
  DAY_COUNTER: "dayCounter",
  MILES_CALCULATOR: "milesCalculator",
  ACADEMY: "academy",
} as const;

export type UserModuleId = (typeof USER_MODULES)[keyof typeof USER_MODULES];

export type EnabledModules = Record<UserModuleId, boolean>;

export const USER_MODULE_IDS: UserModuleId[] = [
  USER_MODULES.QUOTE,
  USER_MODULES.QUOTE_EXPRESS,
  USER_MODULES.DAY_COUNTER,
  USER_MODULES.MILES_CALCULATOR,
  USER_MODULES.ACADEMY,
];

export const USER_MODULE_DEFS: Array<{
  id: UserModuleId;
  label: string;
  description: string;
}> = [
  {
    id: USER_MODULES.QUOTE,
    label: "Nueva cotización",
    description: "Cotizador de viajes",
  },
  {
    id: USER_MODULES.QUOTE_EXPRESS,
    label: "Cotizador express",
    description: "Cotización rápida",
  },
  {
    id: USER_MODULES.DAY_COUNTER,
    label: "Contador de días",
    description: "Itinerario de 25 días",
  },
  {
    id: USER_MODULES.MILES_CALCULATOR,
    label: "Calculadora de millas",
    description: "Cotizador LifeMiles y Smiles",
  },
  {
    id: USER_MODULES.ACADEMY,
    label: "Academia",
    description: "Cursos y tutoriales",
  },
];

export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  quote: true,
  quoteExpress: true,
  dayCounter: true,
  milesCalculator: true,
  academy: true,
};

/** Proveedores no tenían Academia por rol; el super admin la enciende si corresponde. */
export function defaultEnabledModulesForRole(role: string): EnabledModules {
  if (role === ROLES.PROVIDER) {
    return { ...DEFAULT_ENABLED_MODULES, academy: false };
  }
  return { ...DEFAULT_ENABLED_MODULES };
}

export function normalizeEnabledModules(raw: unknown): EnabledModules {
  const result: EnabledModules = { ...DEFAULT_ENABLED_MODULES };
  if (!raw || typeof raw !== "object") return result;
  const obj = raw as Record<string, unknown>;
  for (const id of USER_MODULE_IDS) {
    if (obj[id] === false) result[id] = false;
  }
  return result;
}

export type ModuleAccessUser = {
  role?: string | null;
  enabledModules?: unknown;
  milesProgramsAllowed?: string | null;
};

export function canAccessModule(user: ModuleAccessUser | null | undefined, moduleId: UserModuleId): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  return normalizeEnabledModules(user.enabledModules)[moduleId];
}

export function canAccessMilesCalculator(user: ModuleAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (!canAccessModule(user, USER_MODULES.MILES_CALCULATOR)) return false;
  return canUseMilesCalculator(normalizeMilesProgramsAllowed(user.milesProgramsAllowed));
}

/**
 * El módulo de millas solo queda encendido si hay al menos una calculadora (LifeMiles o Smiles).
 * Si ambas están apagadas, el módulo también se apaga.
 */
export function reconcileMilesModuleAccess(
  enabledModules: EnabledModules,
  milesProgramsAllowed: MilesProgramsAllowed,
): { enabledModules: EnabledModules; milesProgramsAllowed: MilesProgramsAllowed } {
  const hasProgram = canUseMilesCalculator(milesProgramsAllowed);
  if (enabledModules.milesCalculator && !hasProgram) {
    return {
      enabledModules: { ...enabledModules, milesCalculator: false },
      milesProgramsAllowed,
    };
  }
  return { enabledModules, milesProgramsAllowed };
}
