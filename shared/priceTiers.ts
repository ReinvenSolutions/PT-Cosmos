export type PriceTier = {
  startDate?: string;
  endDate: string;
  price: string;
  isFlightDay?: boolean;
  flightLabel?: string;
};

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha actual en Colombia (YYYY-MM-DD), zona horaria de operación del negocio. */
export function todayYmdInColombia(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(now);
}

/** Un tier venció cuando su fecha de fin (salida / vigencia) es anterior a hoy. */
export function isPriceTierExpired(tier: PriceTier, todayYmd: string): boolean {
  if (!YMD_RE.test(tier.endDate)) return false;
  return tier.endDate < todayYmd;
}

export function pruneExpiredPriceTiers(
  tiers: PriceTier[] | null | undefined,
  todayYmd: string,
): PriceTier[] | null {
  if (!tiers?.length) return null;
  const kept = tiers.filter((tier) => !isPriceTierExpired(tier, todayYmd));
  return kept.length > 0 ? kept : null;
}

/** Formato canónico USD en price tiers: siempre 2 decimales (ej. "549.00"). */
export function normalizeTierPrice(value: string | number): string | null {
  const raw = String(value).trim().replace(",", ".");
  if (!raw) return null;
  const parsed = parseFloat(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed.toFixed(2);
}

export function normalizePriceTiers(tiers: PriceTier[]): PriceTier[] {
  return tiers.map((tier) => {
    if (!tier.price?.trim()) return tier;
    const normalized = normalizeTierPrice(tier.price);
    return normalized ? { ...tier, price: normalized } : tier;
  });
}
