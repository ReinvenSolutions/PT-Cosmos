/** COP que se suma a la TRM base configurada para obtener la tasa efectiva del cotizador. */
export const TRM_EFFECTIVE_SURCHARGE_COP = 30;

export const GLOBAL_TRM_BASE_SETTING_KEY = "global_trm_base";

export function effectiveTrmFromBase(base: number | null | undefined): number | null {
  if (base == null || !Number.isFinite(base) || base <= 0) return null;
  return base + TRM_EFFECTIVE_SURCHARGE_COP;
}
