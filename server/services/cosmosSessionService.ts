import { count, desc, eq, gte, sql } from "drizzle-orm";
import {
  cosmosSessionMessages,
  cosmosSessions,
  users,
  type CosmosSession,
  type CosmosSessionMessage,
} from "@shared/schema";
import type { CosmosChannel } from "@shared/cosmosAgent";
import { db } from "../db";
import { logger } from "../logger";

export async function createCosmosSession(opts: {
  id?: string;
  userId: string;
  channel: CosmosChannel;
  roomName?: string | null;
  currentPlanId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CosmosSession> {
  const [row] = await db
    .insert(cosmosSessions)
    .values({
      id: opts.id,
      userId: opts.userId,
      channel: opts.channel,
      roomName: opts.roomName ?? null,
      currentPlanId: opts.currentPlanId ?? null,
      metadata: opts.metadata ?? null,
    })
    .returning();
  return row;
}

export async function ensureCosmosSession(opts: {
  id: string;
  userId: string;
  channel: CosmosChannel;
  roomName?: string | null;
  currentPlanId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<CosmosSession> {
  const existing = await db
    .select()
    .from(cosmosSessions)
    .where(eq(cosmosSessions.id, opts.id))
    .limit(1);
  if (existing[0]) return existing[0];
  return createCosmosSession(opts);
}

export async function updateCosmosSessionMetadata(
  sessionId: string,
  extraMetadata: Record<string, unknown>
): Promise<void> {
  try {
    const existing = await db
      .select({ metadata: cosmosSessions.metadata })
      .from(cosmosSessions)
      .where(eq(cosmosSessions.id, sessionId))
      .limit(1);
    const metadata = {
      ...((existing[0]?.metadata as Record<string, unknown> | null) ?? {}),
      ...extraMetadata,
    };
    await db.update(cosmosSessions).set({ metadata }).where(eq(cosmosSessions.id, sessionId));
  } catch (err) {
    logger.warn("No se pudo actualizar metadata de sesión Cosmos", { err, sessionId });
  }
}

export async function endCosmosSession(
  sessionId: string,
  extraMetadata?: Record<string, unknown>
): Promise<void> {
  try {
    const existing = await db
      .select({ metadata: cosmosSessions.metadata })
      .from(cosmosSessions)
      .where(eq(cosmosSessions.id, sessionId))
      .limit(1);
    const merged = {
      ...((existing[0]?.metadata as Record<string, unknown> | null) ?? {}),
      ...(extraMetadata ?? {}),
    };
    await db
      .update(cosmosSessions)
      .set({
        endedAt: new Date(),
        metadata: Object.keys(merged).length ? merged : existing[0]?.metadata ?? null,
      })
      .where(eq(cosmosSessions.id, sessionId));
  } catch (err) {
    logger.warn("No se pudo cerrar sesión Cosmos", { err, sessionId });
  }
}

export async function appendCosmosSessionMessage(opts: {
  sessionId: string;
  role: "user" | "assistant" | "tool";
  content: string;
  toolName?: string | null;
}): Promise<void> {
  const content = opts.content.trim();
  if (!content) return;
  try {
    await db.insert(cosmosSessionMessages).values({
      sessionId: opts.sessionId,
      role: opts.role,
      content: content.slice(0, 20000),
      toolName: opts.toolName ?? null,
    });
  } catch (err) {
    logger.warn("No se pudo guardar mensaje Cosmos", { err, sessionId: opts.sessionId });
  }
}

export type CosmosSessionListItem = CosmosSession & {
  userName: string | null;
  username: string;
  messageCount: number;
};

export async function listCosmosSessions(limit = 40): Promise<CosmosSessionListItem[]> {
  const rows = await db
    .select({
      session: cosmosSessions,
      userName: users.name,
      username: users.username,
      messageCount: sql<number>`(
        select count(*)::int from cosmos_session_messages m where m.session_id = ${cosmosSessions.id}
      )`,
    })
    .from(cosmosSessions)
    .innerJoin(users, eq(users.id, cosmosSessions.userId))
    .orderBy(desc(cosmosSessions.startedAt))
    .limit(Math.min(Math.max(limit, 1), 100));

  return rows.map((r) => ({
    ...r.session,
    userName: r.userName,
    username: r.username,
    messageCount: Number(r.messageCount) || 0,
  }));
}

export async function getCosmosSessionMessages(sessionId: string): Promise<CosmosSessionMessage[]> {
  return db
    .select()
    .from(cosmosSessionMessages)
    .where(eq(cosmosSessionMessages.sessionId, sessionId))
    .orderBy(cosmosSessionMessages.createdAt);
}

export async function getCosmosSessionStats(): Promise<{
  total: number;
  last24h: number;
  text: number;
  voice: number;
  sip: number;
}> {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [totals] = await db.select({ total: count() }).from(cosmosSessions);
  const [last24h] = await db
    .select({ total: count() })
    .from(cosmosSessions)
    .where(gte(cosmosSessions.startedAt, dayAgo));
  const byChannel = await db
    .select({
      channel: cosmosSessions.channel,
      total: count(),
    })
    .from(cosmosSessions)
    .groupBy(cosmosSessions.channel);

  const channelCount = (channel: string) =>
    Number(byChannel.find((r) => r.channel === channel)?.total ?? 0);

  return {
    total: Number(totals?.total ?? 0),
    last24h: Number(last24h?.total ?? 0),
    text: channelCount("text"),
    voice: channelCount("voice"),
    sip: channelCount("sip"),
  };
}

export async function getCosmosSessionById(sessionId: string): Promise<CosmosSession | null> {
  const rows = await db.select().from(cosmosSessions).where(eq(cosmosSessions.id, sessionId)).limit(1);
  return rows[0] ?? null;
}
