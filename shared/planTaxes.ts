export interface PlanTax {
  id: string;
  label: string;
  amount: string;
  currency: "USD" | "COP";
  /** Si es true (por defecto), el monto se multiplica por pasajeros en la cotización. */
  perPassenger?: boolean;
}

export function createEmptyPlanTax(): PlanTax {
  return {
    id: crypto.randomUUID(),
    label: "",
    amount: "",
    currency: "USD",
    perPassenger: true,
  };
}

function toUsd(amount: string, currency: "USD" | "COP", effectiveTrm: number): number {
  const num = parseFloat(amount.replace(/,/g, "")) || 0;
  if (currency === "COP" && effectiveTrm > 0) return num / effectiveTrm;
  return num;
}

export interface PlanTaxLine {
  destinationId: string;
  destinationName: string;
  taxId: string;
  label: string;
  unitAmountUSD: number;
  perPassenger: boolean;
  quantity: number;
  amountUSD: number;
}

export interface PlanTaxesBreakdown {
  lines: PlanTaxLine[];
  totalUSD: number;
}

type DestinationWithTaxes = {
  id: string;
  name: string;
  planTaxes?: PlanTax[] | null;
};

export function calculatePlanTaxes(
  destinations: DestinationWithTaxes[],
  passengers: number,
  effectiveTrm: number,
): PlanTaxesBreakdown {
  const pax = Math.max(1, passengers);
  const lines: PlanTaxLine[] = [];

  for (const dest of destinations) {
    const taxes = dest.planTaxes ?? [];
    for (const tax of taxes) {
      if (!tax.label.trim() && !tax.amount.trim()) continue;
      const unitAmountUSD = toUsd(tax.amount, tax.currency, effectiveTrm);
      if (unitAmountUSD <= 0) continue;
      const perPassenger = tax.perPassenger !== false;
      const quantity = perPassenger ? pax : 1;
      lines.push({
        destinationId: dest.id,
        destinationName: dest.name,
        taxId: tax.id,
        label: tax.label.trim() || "Impuesto",
        unitAmountUSD,
        perPassenger,
        quantity,
        amountUSD: unitAmountUSD * quantity,
      });
    }
  }

  const totalUSD = lines.reduce((sum, line) => sum + line.amountUSD, 0);
  return { lines, totalUSD };
}
