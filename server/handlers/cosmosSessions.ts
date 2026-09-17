import type { Request, Response } from "express";
import { z } from "zod";
import {
  getCosmosSessionMessages,
  getCosmosSessionStats,
  listCosmosSessions,
} from "../services/cosmosSessionService";

export async function handleCosmosSessionStats(_req: Request, res: Response): Promise<void> {
  const stats = await getCosmosSessionStats();
  res.json(stats);
}

export async function handleListCosmosSessions(req: Request, res: Response): Promise<void> {
  const limit = z.coerce.number().int().min(1).max(100).optional().parse(req.query.limit) ?? 40;
  const sessions = await listCosmosSessions(limit);
  res.json({ sessions });
}

export async function handleGetCosmosSessionMessages(req: Request, res: Response): Promise<void> {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const messages = await getCosmosSessionMessages(id);
  res.json({ messages });
}
