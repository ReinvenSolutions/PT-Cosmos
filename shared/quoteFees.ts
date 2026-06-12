export const DEFAULT_CARD_FEE_PERCENT = 3;

export interface QuoteFeesConfig {
  cardFeeEnabled: boolean;
  /** Siempre 3 %; se conserva en BD por compatibilidad. */
  cardFeePercent?: number;
}

export const EMPTY_QUOTE_FEES_CONFIG: QuoteFeesConfig = {
  cardFeeEnabled: false,
  cardFeePercent: DEFAULT_CARD_FEE_PERCENT,
};

/** Normaliza configuración guardada (ignora fees personalizados legacy). */
export function normalizeQuoteFeesConfig(
  config: QuoteFeesConfig | null | undefined,
): QuoteFeesConfig {
  return {
    cardFeeEnabled: config?.cardFeeEnabled ?? false,
    cardFeePercent: DEFAULT_CARD_FEE_PERCENT,
  };
}

export interface QuoteFeesBreakdown {
  cardFeeUSD: number;
  totalFeesUSD: number;
  clientTotalUSD: number;
}

export function calculateQuoteFees(
  config: QuoteFeesConfig,
  finalPriceUSD: number,
  _effectiveTrm: number,
): QuoteFeesBreakdown {
  const cardFeeUSD =
    config.cardFeeEnabled && finalPriceUSD > 0
      ? finalPriceUSD * (DEFAULT_CARD_FEE_PERCENT / 100)
      : 0;

  return {
    cardFeeUSD,
    totalFeesUSD: cardFeeUSD,
    clientTotalUSD: finalPriceUSD + cardFeeUSD,
  };
}
