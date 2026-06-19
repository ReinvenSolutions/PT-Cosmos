import { destinations } from "@shared/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { ValidationError } from "./errors/AppError";

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function sumPassengersByDestination(
  rows: { destinationId: string; passengers: number | null }[],
  bloqueoIds: Set<string>,
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    if (!bloqueoIds.has(r.destinationId)) continue;
    const p = r.passengers ?? 1;
    m.set(r.destinationId, (m.get(r.destinationId) ?? 0) + p);
  }
  return m;
}

export async function loadBloqueoIds(tx: DbTransaction, destinationIds: string[]): Promise<Set<string>> {
  if (destinationIds.length === 0) return new Set();
  const rows = await tx
    .select({ id: destinations.id })
    .from(destinations)
    .where(and(inArray(destinations.id, destinationIds), eq(destinations.isBloqueo, true)));
  return new Set(rows.map((r) => r.id));
}

/** deltas: destinationId -> (positivo consume cupos, negativo libera) */
export async function applyBloqueoCuposDelta(tx: DbTransaction, deltas: Map<string, number>): Promise<void> {
  const deltaEntries = Array.from(deltas.entries());
  for (let i = 0; i < deltaEntries.length; i++) {
    const destId = deltaEntries[i]![0];
    const delta = deltaEntries[i]![1];
    if (delta === 0) continue;
    if (delta > 0) {
      const updated = await tx
        .update(destinations)
        .set({
          bloqueoCuposDisponibles: sql`${destinations.bloqueoCuposDisponibles} - ${delta}`,
        })
        .where(
          and(
            eq(destinations.id, destId),
            eq(destinations.isBloqueo, true),
            sql`${destinations.bloqueoCuposDisponibles} IS NOT NULL`,
            sql`${destinations.bloqueoCuposDisponibles} >= ${delta}`,
          ),
        )
        .returning({ id: destinations.id });
      if (updated.length === 0) {
        throw new ValidationError(
          "No hay cupos suficientes para este bloqueo (otra agencia pudo reservar antes). Actualiza la página e intenta de nuevo.",
        );
      }
    } else {
      const release = -delta;
      await tx
        .update(destinations)
        .set({
          bloqueoCuposDisponibles: sql`COALESCE(${destinations.bloqueoCuposDisponibles}, 0) + ${release}`,
        })
        .where(and(eq(destinations.id, destId), eq(destinations.isBloqueo, true)));
    }
  }
}

export function mergeBloqueoDeltaMaps(
  oldPax: Map<string, number>,
  newPax: Map<string, number>,
): Map<string, number> {
  const idList = Array.from(oldPax.keys()).concat(Array.from(newPax.keys()));
  const ids = Array.from(new Set(idList));
  const out = new Map<string, number>();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]!;
    const d = (newPax.get(id) ?? 0) - (oldPax.get(id) ?? 0);
    if (d !== 0) out.set(id, d);
  }
  return out;
}

export async function applyBloqueoCuposForQuoteChange(
  tx: DbTransaction,
  oldRows: { destinationId: string; passengers: number | null }[],
  newRows: { destinationId: string; passengers: number | null }[],
): Promise<void> {
  const ids = Array.from(
    new Set(
      oldRows.map((r) => r.destinationId).concat(newRows.map((r) => r.destinationId)),
    ),
  );
  const bloqueoIds = await loadBloqueoIds(tx, ids);
  if (bloqueoIds.size === 0) return;

  const oldPax = sumPassengersByDestination(oldRows, bloqueoIds);
  const newPax = sumPassengersByDestination(newRows, bloqueoIds);
  const deltas = mergeBloqueoDeltaMaps(oldPax, newPax);
  await applyBloqueoCuposDelta(tx, deltas);
}
