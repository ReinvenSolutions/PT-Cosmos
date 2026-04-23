import type { Destination } from "@shared/schema";
import { ValidationError } from "./errors/AppError";

export function toYmd(value: string | Date): string {
  if (typeof value === "string") {
    const s = value.includes("T") ? value.split("T")[0]! : value.slice(0, 10);
    return s;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function assertBloqueoQuoteAllowed(
  rows: { destinationId: string; startDate: string | Date; passengers?: number | null }[],
  destinationsById: Map<string, Destination>,
) {
  if (rows.length === 0) return;

  const ids = Array.from(new Set(rows.map((r) => r.destinationId)));
  const bloqueoIds = ids.filter((id) => destinationsById.get(id)?.isBloqueo);
  if (bloqueoIds.length === 0) return;

  if (ids.length > 1 || bloqueoIds.length !== ids.length) {
    throw new ValidationError("Un plan bloqueo no se puede combinar con otros destinos.");
  }

  const dest = destinationsById.get(bloqueoIds[0]!)!;
  const fixed = dest.bloqueoSalidaFecha?.trim();
  if (!fixed) {
    throw new ValidationError("Este bloqueo no tiene fecha de salida configurada. Contacta al administrador.");
  }
  if (dest.bloqueoCuposDisponibles == null) {
    throw new ValidationError("Este bloqueo no tiene cupos configurados. Contacta al administrador.");
  }

  const row = rows[0]!;
  const pax = row.passengers ?? 1;
  if (pax > dest.bloqueoCuposDisponibles) {
    throw new ValidationError("No hay cupos suficientes para la cantidad de pasajeros.");
  }

  if (toYmd(row.startDate) !== fixed) {
    throw new ValidationError(`La fecha de salida debe ser la del bloqueo: ${fixed}`);
  }
}
