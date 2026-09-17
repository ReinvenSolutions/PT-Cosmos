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
  COSMOS: "cosmos",
  COSMOS_VOICE: "cosmosVoice",
} as const;

export type UserModuleId = (typeof USER_MODULES)[keyof typeof USER_MODULES];

export type EnabledModules = Record<UserModuleId, boolean>;

export const USER_MODULE_IDS: UserModuleId[] = [
  USER_MODULES.QUOTE,
  USER_MODULES.QUOTE_EXPRESS,
  USER_MODULES.DAY_COUNTER,
  USER_MODULES.MILES_CALCULATOR,
  USER_MODULES.ACADEMY,
  USER_MODULES.COSMOS,
  USER_MODULES.COSMOS_VOICE,
];

function foldModuleAlias(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_-]+/g, "");
}

/** Nombres que Cosmos (y el admin) pueden dictar para un módulo. */
const USER_MODULE_ALIASES: Record<string, UserModuleId> = {
  quote: USER_MODULES.QUOTE,
  cotizacion: USER_MODULES.QUOTE,
  cotizador: USER_MODULES.QUOTE,
  nuevacotizacion: USER_MODULES.QUOTE,
  quoteexpress: USER_MODULES.QUOTE_EXPRESS,
  express: USER_MODULES.QUOTE_EXPRESS,
  cotizadorexpress: USER_MODULES.QUOTE_EXPRESS,
  daycounter: USER_MODULES.DAY_COUNTER,
  contador: USER_MODULES.DAY_COUNTER,
  contadordedias: USER_MODULES.DAY_COUNTER,
  milescalculator: USER_MODULES.MILES_CALCULATOR,
  millas: USER_MODULES.MILES_CALCULATOR,
  calculadora: USER_MODULES.MILES_CALCULATOR,
  calculadorademillas: USER_MODULES.MILES_CALCULATOR,
  academy: USER_MODULES.ACADEMY,
  academia: USER_MODULES.ACADEMY,
  tutoriales: USER_MODULES.ACADEMY,
  cosmos: USER_MODULES.COSMOS,
  asistente: USER_MODULES.COSMOS,
  cosmosasistente: USER_MODULES.COSMOS,
  cosmosvoice: USER_MODULES.COSMOS_VOICE,
  voz: USER_MODULES.COSMOS_VOICE,
  cosmosvoz: USER_MODULES.COSMOS_VOICE,
};

export function resolveUserModuleId(raw: string): UserModuleId | null {
  const folded = foldModuleAlias(raw);
  return USER_MODULE_ALIASES[folded] ?? null;
}

export function resolveUserModuleIds(raw: string[]): { ids: UserModuleId[]; unknown: string[] } {
  const ids: UserModuleId[] = [];
  const unknown: string[] = [];
  for (const item of raw) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const id = resolveUserModuleId(trimmed);
    if (!id) {
      unknown.push(trimmed);
      continue;
    }
    if (!ids.includes(id)) ids.push(id);
  }
  return { ids, unknown };
}

export function userModuleLabel(id: UserModuleId): string {
  if (id === USER_MODULES.COSMOS_VOICE) return "Cosmos voz";
  return USER_MODULE_DEFS.find((mod) => mod.id === id)?.label ?? id;
}

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
  {
    id: USER_MODULES.COSMOS,
    label: "Cosmos asistente",
    description: "Asistente de IA en chat. Opcionalmente también por voz.",
  },
];

export const DEFAULT_ENABLED_MODULES: EnabledModules = {
  quote: true,
  quoteExpress: true,
  dayCounter: true,
  milesCalculator: true,
  academy: true,
  cosmos: false,
  cosmosVoice: false,
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
    else if (obj[id] === true) result[id] = true;
  }
  return reconcileCosmosModuleAccess(result);
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

export function canAccessCosmos(user: ModuleAccessUser | null | undefined): boolean {
  return canAccessModule(user, USER_MODULES.COSMOS);
}

/** Voz solo si el módulo Cosmos está encendido y el switch de voz también. */
export function canAccessCosmosVoice(user: ModuleAccessUser | null | undefined): boolean {
  if (!user) return false;
  if (user.role === ROLES.SUPER_ADMIN) return true;
  const mods = normalizeEnabledModules(user.enabledModules);
  return mods.cosmos && mods.cosmosVoice;
}

/** Si Cosmos está apagado, la voz no puede quedar encendida sola. */
export function reconcileCosmosModuleAccess(enabledModules: EnabledModules): EnabledModules {
  if (!enabledModules.cosmos && enabledModules.cosmosVoice) {
    return { ...enabledModules, cosmosVoice: false };
  }
  return enabledModules;
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
