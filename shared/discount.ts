/** Normaliza un porcentaje de descuento entre 0 y 100. */
export function normalizeDiscountPercentage(value: number | string | null | undefined): number {
  const n = typeof value === "string" ? parseFloat(value) : Number(value ?? 0);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(100, n);
}

/** Aplica descuento solo sobre la porción terrestre total. */
export function applyLandPortionDiscount(
  landPortionTotal: number,
  discountPercentage: number | string | null | undefined,
) {
  const pct = normalizeDiscountPercentage(discountPercentage);
  const discountAmount = landPortionTotal * (pct / 100);
  const discountedLandPortion = landPortionTotal - discountAmount;
  return {
    discountPercentage: pct,
    discountAmount,
    discountedLandPortion,
  };
}
