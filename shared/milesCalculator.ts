/** Tipo de recargo sobre el total calculado en el cotizador de millas. */
export type MilesMarkupType = "none" | "percentage" | "fixed";

/** Programas de millas habilitados para el usuario. `none` = sin acceso al cotizador. */
export type MilesProgramsAllowed = "none" | "lifemiles" | "smiles" | "both";

export const MILES_MARKUP_TYPES = ["none", "percentage", "fixed"] as const;
export const MILES_PROGRAMS_ALLOWED = ["none", "lifemiles", "smiles", "both"] as const;

export const DEFAULT_USD_PER_1000_LIFEMILES = 16.9;
export const DEFAULT_USD_PER_1000_SMILES = 4.3;
/** Tasa de cambio BRL por USD (1 USD = N BRL). Usada para convertir impuestos Smiles a USD. */
export const DEFAULT_BRL_PER_USD = 5.3;

export const GLOBAL_USD_PER_1000_LIFEMILES_SETTING_KEY = "miles_usd_per_1000_lifemiles";
export const GLOBAL_USD_PER_1000_SMILES_SETTING_KEY = "miles_usd_per_1000_smiles";
export const GLOBAL_BRL_PER_USD_SETTING_KEY = "smiles_brl_per_usd";

export function parseUsdPer1000Miles(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function parseBrlPerUsd(raw: string | null | undefined, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function normalizeMilesMarkupType(value: unknown): MilesMarkupType {
  if (value === "percentage" || value === "fixed") return value;
  return "none";
}

export function normalizeMilesProgramsAllowed(value: unknown): MilesProgramsAllowed {
  if (value === "none" || value === "lifemiles" || value === "smiles") return value;
  return "both";
}

export function canUseMilesCalculator(programs: MilesProgramsAllowed): boolean {
  return programs !== "none";
}

export function canUseLifeMiles(programs: MilesProgramsAllowed): boolean {
  return programs === "lifemiles" || programs === "both";
}

export function canUseSmiles(programs: MilesProgramsAllowed): boolean {
  return programs === "smiles" || programs === "both";
}

export function resolveMilesProgramMarkup(
  program: MilesProgram,
  settings: {
    milesMarkupTypeLifemiles?: unknown;
    milesMarkupValueLifemiles?: unknown;
    milesMarkupTypeSmiles?: unknown;
    milesMarkupValueSmiles?: unknown;
  },
): { type: MilesMarkupType; value: number } {
  const isLifeMiles = program === "LIFE MILES";
  const type = normalizeMilesMarkupType(
    isLifeMiles ? settings.milesMarkupTypeLifemiles : settings.milesMarkupTypeSmiles,
  );
  const rawValue = isLifeMiles ? settings.milesMarkupValueLifemiles : settings.milesMarkupValueSmiles;
  const value = Number(rawValue ?? 0);
  return { type, value: Number.isFinite(value) ? value : 0 };
}

export function formatMilesMarkupShort(type: MilesMarkupType, value: number): string | null {
  if (type === "percentage" && value > 0) return `+${value}%`;
  if (type === "fixed" && value > 0) return `+$${value.toLocaleString("es-CO")}`;
  return null;
}

export function applyMilesMarkup(
  baseTotal: number,
  markupType: MilesMarkupType,
  markupValue: number,
): { baseTotal: number; markupAmount: number; finalTotal: number } {
  const safeBase = Number.isFinite(baseTotal) ? baseTotal : 0;
  const safeValue = Number.isFinite(markupValue) ? markupValue : 0;

  if (markupType === "percentage" && safeValue > 0) {
    const markupAmount = safeBase * (safeValue / 100);
    return { baseTotal: safeBase, markupAmount, finalTotal: safeBase + markupAmount };
  }
  if (markupType === "fixed" && safeValue > 0) {
    return { baseTotal: safeBase, markupAmount: safeValue, finalTotal: safeBase + safeValue };
  }
  return { baseTotal: safeBase, markupAmount: 0, finalTotal: safeBase };
}

export type MilesProgram = "LIFE MILES" | "SMILES";

export function calculateMilesSegmentCop(params: {
  program: MilesProgram;
  miles: number;
  /** Impuesto en COP (LifeMiles) o en BRL (Smiles), según el programa. */
  taxAmount: number;
  usdPer1000LifeMiles: number;
  usdPer1000Smiles: number;
  effectiveTrm: number;
  /** 1 USD = N BRL. Solo aplica a Smiles. */
  brlPerUsd?: number;
}): { milesInCop: number; taxInCop: number; subtotalPerPax: number } {
  const {
    program,
    miles,
    taxAmount,
    usdPer1000LifeMiles,
    usdPer1000Smiles,
    effectiveTrm,
    brlPerUsd,
  } = params;
  const safeMiles = Number.isFinite(miles) ? miles : 0;
  const safeTax = Number.isFinite(taxAmount) ? taxAmount : 0;
  const safeTrm = Number.isFinite(effectiveTrm) && effectiveTrm > 0 ? effectiveTrm : 0;

  if (program === "LIFE MILES") {
    const milesInUsd = (safeMiles * usdPer1000LifeMiles) / 1000;
    const milesInCop = milesInUsd * safeTrm;
    return {
      milesInCop,
      taxInCop: safeTax,
      subtotalPerPax: milesInCop + safeTax,
    };
  }

  const safeBrlPerUsd = Number.isFinite(brlPerUsd) && brlPerUsd! > 0 ? brlPerUsd! : 0;
  const milesInUsd = (safeMiles / 1000) * usdPer1000Smiles;
  const taxInUsd = safeBrlPerUsd > 0 ? Math.round((safeTax / safeBrlPerUsd) * 1000) / 1000 : 0;
  const milesInCop = milesInUsd * safeTrm;
  const taxInCop = taxInUsd * safeTrm;

  return {
    milesInCop,
    taxInCop,
    subtotalPerPax: milesInCop + taxInCop,
  };
}
