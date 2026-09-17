import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { User } from "@shared/schema";
import type { CosmosVoiceJobMetadata } from "@shared/cosmosAgent";
import { cosmosDisplayName } from "../services/cosmosBrain";
import { createCosmosSession } from "../services/cosmosSessionService";
import { createCosmosVoiceToken, getLiveKitUrl, isLiveKitConfigured } from "../services/livekit";
import { isOpenAIConfigured } from "../services/openaiClient";
import { cosmosScreenContextSchema } from "@shared/cosmosAgent";

const bodySchema = z.object({
  currentPlanId: z.string().uuid().optional(),
  channel: z.enum(["voice", "sip"]).optional(),
  screen: cosmosScreenContextSchema.optional(),
});

export async function handleCosmosVoiceToken(req: Request, res: Response): Promise<void> {
  if (!isOpenAIConfigured()) {
    res.status(503).json({ message: "Cosmos no está disponible: falta OPENAI_API_KEY." });
    return;
  }
  if (!isLiveKitConfigured()) {
    res.status(503).json({
      message:
        "La voz de Cosmos no está activa: configura LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET.",
    });
    return;
  }

  const user = req.user as User;
  const { currentPlanId, channel, screen } = bodySchema.parse(req.body ?? {});
  const sessionId = randomUUID();
  const roomName = `cosmos-${user.id.slice(0, 8)}-${sessionId.slice(0, 8)}`;
  const userIdentity = `user-${user.id}`;
  const metadata: CosmosVoiceJobMetadata = {
    sessionId,
    userId: user.id,
    userRole: user.role,
    userName: cosmosDisplayName(user),
    currentPlanId: currentPlanId ?? screen?.planId,
    channel: channel ?? "voice",
    userIdentity,
    screen,
  };

  await createCosmosSession({
    id: sessionId,
    userId: user.id,
    channel: metadata.channel,
    roomName,
    currentPlanId: currentPlanId ?? null,
    metadata: { userIdentity },
  });

  const token = await createCosmosVoiceToken({
    roomName,
    identity: userIdentity,
    name: cosmosDisplayName(user),
    metadata,
  });

  res.json({
    token,
    url: getLiveKitUrl(),
    roomName,
    sessionId,
    identity: userIdentity,
  });
}
