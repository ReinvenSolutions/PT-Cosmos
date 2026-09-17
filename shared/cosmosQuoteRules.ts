import { isTurkeyPlan } from "./planCosmosHints";

export type CosmosQuoteRulePlan = {
  id: string;
  name: string;
  country: string;
  isBloqueo?: boolean | null;
  bloqueoSalidaFecha?: string | null;
  bloqueoCuposDisponibles?: number | null;
  requiresTuesday?: boolean | null;
  allowedDays?: string[] | null;
};

export type CosmosQuoteValidation = {
  ok: boolean;
  warnings: string[];
  errors: string[];
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

function parseYmd(value?: string): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function validateCosmosQuoteDraft(
  plans: CosmosQuoteRulePlan[],
  opts?: { startDate?: string; passengers?: number }
): CosmosQuoteValidation {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!plans.length) {
    return { ok: false, errors: ["No hay planes en el borrador."], warnings };
  }

  const bloqueos = plans.filter((p) => p.isBloqueo);
  if (bloqueos.length && plans.length > 1) {
    errors.push("Un bloqueo no se combina con otros planes.");
  }

  const turkey = plans.filter(isTurkeyPlan);
  const others = plans.filter((p) => !isTurkeyPlan(p) && !p.isBloqueo);
  if (turkey.length && others.length && !isTurkeyPlan(plans[0])) {
    errors.push("Si combinas Turquía con otro destino, Turquía debe ir primero en la ruta.");
  }

  const passengers = opts?.passengers;
  if (bloqueos[0] && passengers != null) {
    const cupos = bloqueos[0].bloqueoCuposDisponibles;
    if (cupos != null && passengers > cupos) {
      errors.push(
        `${bloqueos[0].name} tiene ${cupos} cupo(s) y pediste ${passengers} pasajero(s).`
      );
    }
  }

  const start = parseYmd(opts?.startDate);
  if (opts?.startDate && !start) {
    errors.push("La fecha debe ir en formato YYYY-MM-DD.");
  }
  if (start) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (start < today) errors.push("La fecha de salida ya pasó.");

    if (bloqueos[0]?.bloqueoSalidaFecha && opts?.startDate !== bloqueos[0].bloqueoSalidaFecha) {
      errors.push(
        `La salida de ${bloqueos[0].name} es fija: ${bloqueos[0].bloqueoSalidaFecha}.`
      );
    }

    const dow = start.getDay();
    const dayName = DAY_NAMES[dow];
    for (const plan of plans) {
      if (plan.allowedDays?.length && !plan.allowedDays.includes(dayName)) {
        errors.push(
          `${plan.name} solo sale ${plan.allowedDays.join(", ")} y la fecha cae en ${dayName}.`
        );
      }
      if (plan.requiresTuesday && dow !== 2 && !plan.allowedDays?.length) {
        warnings.push(`${plan.name} suele exigir salida en martes.`);
      }
    }
    if (turkey.length && dow !== 2 && !plans.some((p) => p.name === "Turquía Esencial")) {
      warnings.push("Los programas de Turquía suelen salir los martes desde Colombia.");
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export function formatCosmosQuoteValidation(result: CosmosQuoteValidation): string {
  if (result.ok && !result.warnings.length) return "El borrador cumple las reglas de combinación y fechas.";
  const lines: string[] = [];
  if (result.errors.length) {
    lines.push("Problemas:");
    for (const e of result.errors) lines.push(`- ${e}`);
  }
  if (result.warnings.length) {
    lines.push("Avisos:");
    for (const w of result.warnings) lines.push(`- ${w}`);
  }
  if (result.ok) lines.unshift("El borrador es usable, con avisos:");
  return lines.join("\n");
}
