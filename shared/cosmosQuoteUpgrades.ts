export type CosmosPlanUpgrade = {
  code: string;
  name: string;
  description?: string;
  price: number;
};

export const TURKEY_FALLBACK_UPGRADES: CosmosPlanUpgrade[] = [
  {
    code: "option1",
    name: "Almuerzos y tours en Estambul",
    description: "8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico",
    price: 500,
  },
  {
    code: "option2",
    name: "Hotel céntrico en Estambul",
    description: "Hotel céntrico Estambul + 8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico",
    price: 770,
  },
  {
    code: "option3",
    name: "Hotel céntrico y cueva en Capadocia",
    description:
      "Hotel céntrico Estambul + Hotel cueva Capadocia + 8 almuerzos + Tour por el Bósforo + Tour Estambul Clásico",
    price: 1100,
  },
];

export function normalizeUpgradeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function isTurkeyEsencialName(name: string): boolean {
  const n = normalizeUpgradeText(name);
  return n.includes("turquia esencial");
}

export function isItaliaTuristicaName(name: string): boolean {
  const n = normalizeUpgradeText(name);
  return n.includes("italia turistica");
}

export function isGranTourEuropaName(name: string): boolean {
  const n = normalizeUpgradeText(name);
  return n.includes("gran tour de europa");
}

export function upgradesForPlan(plan: {
  name: string;
  upgrades?: CosmosPlanUpgrade[] | null;
}): CosmosPlanUpgrade[] {
  const listed = Array.isArray(plan.upgrades) ? plan.upgrades.filter((u) => u?.code && u?.name) : [];
  if (listed.length) return listed;
  return isTurkeyEsencialName(plan.name) ? TURKEY_FALLBACK_UPGRADES : [];
}

export function matchPlanUpgrade(
  upgrades: CosmosPlanUpgrade[],
  query?: string | null
): CosmosPlanUpgrade | null {
  if (!upgrades.length) return null;
  const q = normalizeUpgradeText(query ?? "");
  if (!q) return upgrades.length === 1 ? upgrades[0] : null;

  const byCode = upgrades.find((u) => normalizeUpgradeText(u.code) === q);
  if (byCode) return byCode;

  const optionMatch = q.match(/^(option|opcion|mejora|upgrade)\s*(\d+)$/);
  if (optionMatch) {
    const n = optionMatch[2];
    const coded = upgrades.find(
      (u) => normalizeUpgradeText(u.code) === `option${n}` || normalizeUpgradeText(u.code) === n
    );
    if (coded) return coded;
    const idx = Number(n) - 1;
    if (idx >= 0 && idx < upgrades.length) return upgrades[idx];
  }

  const exactName = upgrades.find((u) => normalizeUpgradeText(u.name) === q);
  if (exactName) return exactName;

  const partial = upgrades.filter((u) => {
    const name = normalizeUpgradeText(u.name);
    const description = normalizeUpgradeText(u.description ?? "");
    return name.includes(q) || q.includes(name) || description.includes(q) || q.includes(description);
  });
  if (partial.length === 1) return partial[0];
  if (partial.length > 1) {
    return [...partial].sort(
      (a, b) => normalizeUpgradeText(b.name).length - normalizeUpgradeText(a.name).length
    )[0];
  }

  const priceDigits = q.replace(/\D/g, "");
  if (priceDigits.length >= 3) {
    const byPrice = upgrades.filter((u) => String(Math.round(Number(u.price))) === priceDigits);
    if (byPrice.length === 1) return byPrice[0];
  }

  return null;
}

export function formatUpgradeChoices(upgrades: CosmosPlanUpgrade[]): string {
  return upgrades
    .map((u) => `[${u.code}] ${u.name} (USD ${u.price})${u.description ? ` — ${u.description}` : ""}`)
    .join("; ");
}

export function applySelectedUpgradesMap(
  selectedUpgrades: Record<string, string>,
  dests: Array<{ id: string; name: string }>
): {
  turkeyUpgrade?: string;
  italiaUpgrade?: string;
  granTourUpgrade?: string;
  otherDestUpgrades: Record<string, string>;
} {
  const otherDestUpgrades: Record<string, string> = {};
  let turkeyUpgrade: string | undefined;
  let italiaUpgrade: string | undefined;
  let granTourUpgrade: string | undefined;

  for (const [planId, code] of Object.entries(selectedUpgrades)) {
    const dest = dests.find((d) => d.id === planId);
    if (!dest) {
      otherDestUpgrades[planId] = code;
      continue;
    }
    if (isTurkeyEsencialName(dest.name)) turkeyUpgrade = code;
    else if (isItaliaTuristicaName(dest.name)) italiaUpgrade = code;
    else if (isGranTourEuropaName(dest.name)) granTourUpgrade = code;
    else otherDestUpgrades[planId] = code;
  }

  return { turkeyUpgrade, italiaUpgrade, granTourUpgrade, otherDestUpgrades };
}
