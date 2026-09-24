import { asc, count, eq } from "drizzle-orm";
import { cosmosStrategicContexts } from "@shared/schema";
import {
  type CosmosStrategicContext,
  type CosmosStrategicContextWrite,
  cosmosStrategicContextWriteSchema,
} from "@shared/cosmosStrategicContexts";
import { db } from "../db";
import { NotFoundError } from "../errors/AppError";
import { cache } from "../utils/cache";
import { sanitizeCosmosAssistantNotes } from "../utils/sanitize";
import { getCosmosAssistantConfig, setCosmosAssistantConfig } from "./cosmosAssistantConfigService";

const CACHE_KEY = "cosmos-strategic-contexts";

function toDto(row: typeof cosmosStrategicContexts.$inferSelect): CosmosStrategicContext {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind === "activity" ? "activity" : "destination",
    content: row.content ?? "",
    destinationId: row.destinationId ?? null,
    pinned: row.pinned,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readRows(): Promise<CosmosStrategicContext[]> {
  const rows = await db
    .select()
    .from(cosmosStrategicContexts)
    .orderBy(asc(cosmosStrategicContexts.name));
  return rows.map(toDto);
}

/** Si aún no hay contextos, convierte el bloque único legado en uno prioritario. */
async function migrateLegacyStrategicContext(existing: CosmosStrategicContext[]): Promise<CosmosStrategicContext[]> {
  if (existing.length > 0) return existing;

  const config = await getCosmosAssistantConfig();
  const legacy = config.strategicContext?.trim();
  if (!legacy) return existing;

  const [created] = await db
    .insert(cosmosStrategicContexts)
    .values({
      name: "Contexto general",
      kind: "destination",
      content: legacy,
      destinationId: null,
      pinned: true,
    })
    .returning();

  await setCosmosAssistantConfig({ ...config, strategicContext: "" });
  cache.del(CACHE_KEY);
  return created ? [toDto(created)] : existing;
}

export async function listCosmosStrategicContexts(): Promise<CosmosStrategicContext[]> {
  const cached = cache.get<CosmosStrategicContext[]>(CACHE_KEY);
  if (cached) return cached;

  const rows = await migrateLegacyStrategicContext(await readRows());
  cache.set(CACHE_KEY, rows, 120);
  return rows;
}

export async function countCosmosStrategicContexts(): Promise<number> {
  const [row] = await db.select({ value: count() }).from(cosmosStrategicContexts);
  return Number(row?.value ?? 0);
}

function parseWrite(input: CosmosStrategicContextWrite): CosmosStrategicContextWrite {
  const parsed = cosmosStrategicContextWriteSchema.parse(input);
  return {
    ...parsed,
    content: sanitizeCosmosAssistantNotes(parsed.content) ?? "",
    destinationId: parsed.destinationId ?? null,
    pinned: parsed.pinned ?? false,
  };
}

export async function createCosmosStrategicContext(
  input: CosmosStrategicContextWrite
): Promise<CosmosStrategicContext> {
  const data = parseWrite(input);
  const [created] = await db
    .insert(cosmosStrategicContexts)
    .values({
      name: data.name,
      kind: data.kind,
      content: data.content,
      destinationId: data.destinationId,
      pinned: data.pinned,
    })
    .returning();
  cache.del(CACHE_KEY);
  return toDto(created);
}

export async function updateCosmosStrategicContext(
  id: string,
  input: CosmosStrategicContextWrite
): Promise<CosmosStrategicContext> {
  const data = parseWrite(input);
  const [updated] = await db
    .update(cosmosStrategicContexts)
    .set({
      name: data.name,
      kind: data.kind,
      content: data.content,
      destinationId: data.destinationId,
      pinned: data.pinned,
      updatedAt: new Date(),
    })
    .where(eq(cosmosStrategicContexts.id, id))
    .returning();
  if (!updated) throw new NotFoundError("Contexto");
  cache.del(CACHE_KEY);
  return toDto(updated);
}

export async function deleteCosmosStrategicContext(id: string): Promise<void> {
  const [deleted] = await db
    .delete(cosmosStrategicContexts)
    .where(eq(cosmosStrategicContexts.id, id))
    .returning({ id: cosmosStrategicContexts.id });
  if (!deleted) throw new NotFoundError("Contexto");
  cache.del(CACHE_KEY);
}
