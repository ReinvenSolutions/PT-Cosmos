import type { Destination } from "@shared/schema";

export type TaxInclusionStatus = "incluidos" | "no_incluidos" | "no_especificado";

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function isTurkeyPlan(dest: Destination): boolean {
  const n = normalizeText(dest.name);
  const c = normalizeText(dest.country);
  return n.includes("turquia") || c.includes("turquia");
}

/** Detecta si el texto del plan menciona impuestos incluidos o no incluidos. */
export function parseTaxInclusionStatus(...texts: (string | null | undefined)[]): TaxInclusionStatus {
  const combined = normalizeText(texts.filter(Boolean).join(" "));

  if (
    /\bimpuestos?\s+no\s+incluid/.test(combined) ||
    /\bno\s+incluye\s+impuestos?/.test(combined) ||
    /\bimpuestos?\s+no\s+incluidos?/.test(combined)
  ) {
    return "no_incluidos";
  }

  if (/\bimpuestos?\s+incluid/.test(combined) || /\bincluye\s+impuestos?/.test(combined)) {
    return "incluidos";
  }

  return "no_especificado";
}

export function formatTaxStatusLabel(status: TaxInclusionStatus): string {
  switch (status) {
    case "incluidos":
      return "INCLUIDOS en la tarifa terrestre (según tooltip/descripción del plan)";
    case "no_incluidos":
      return "NO incluidos en la tarifa terrestre — se pagan aparte (según tooltip/descripción del plan)";
    default:
      return "sin mención explícita en tooltip/descripción; no inferir desde exclusiones genéricas";
  }
}

export function formatCombinationRules(catalog: Destination[]): string {
  const combinable = catalog.filter((d) => !d.isBloqueo);
  const turkeyPlans = catalog.filter(isTurkeyPlan);
  const others = combinable.filter((d) => !isTurkeyPlan(d));
  const bloqueos = catalog.filter((d) => d.isBloqueo);

  const turkeyList = turkeyPlans.map((d) => `- ${d.name} (${d.country})`).join("\n") || "(ninguno)";
  const othersList = others.map((d) => `- ${d.name} (${d.country})`).join("\n") || "(ninguno)";

  return `
## Reglas de combinación de planes (cotizador)

- En **Nueva cotización** (/), puedes combinar varios destinos en una sola cotización.
- **Turquía** (todos los programas turcos) es combinable con **todos los demás planes activos** del catálogo que no sean bloqueo.
- Al combinar Turquía con otro destino, **Turquía siempre va primero** en la ruta.
- Turquía: salidas los **martes** desde Colombia en la mayoría de programas (ver tooltip de cada plan; ej. Turquía Esencial también miércoles/sábados según temporada).
- Los demás destinos internacionales suelen tener **salidas diarias** (ver tooltip de cada plan).
- **Bloqueos** NO se combinan con otros planes.

### Programas de Turquía activos
${turkeyList}

### Planes con los que se puede combinar Turquía (todos los activos excepto bloqueos y otros programas turcos)
${othersList}
${bloqueos.length ? `\n### Bloqueos (NO combinables con otros planes)\n${bloqueos.map((d) => `- ${d.name}`).join("\n")}` : ""}
`.trim();
}
