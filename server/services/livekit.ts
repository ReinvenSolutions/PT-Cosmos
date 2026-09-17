import { AccessToken, RoomAgentDispatch, RoomConfiguration } from "livekit-server-sdk";
import { COSMOS_LIVEKIT_AGENT_NAME, type CosmosVoiceJobMetadata } from "@shared/cosmosAgent";

export function isLiveKitConfigured(): boolean {
  return Boolean(
    process.env.LIVEKIT_URL?.trim() &&
      process.env.LIVEKIT_API_KEY?.trim() &&
      process.env.LIVEKIT_API_SECRET?.trim()
  );
}

export function getLiveKitUrl(): string | null {
  const url = process.env.LIVEKIT_URL?.trim();
  return url || null;
}

export async function createCosmosVoiceToken(opts: {
  roomName: string;
  identity: string;
  name: string;
  metadata: CosmosVoiceJobMetadata;
}): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.LIVEKIT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("LiveKit no está configurado");
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: opts.identity,
    name: opts.name,
    ttl: "15m",
    metadata: JSON.stringify(opts.metadata),
  });
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });
  at.roomConfig = new RoomConfiguration({
    agents: [
      new RoomAgentDispatch({
        agentName: COSMOS_LIVEKIT_AGENT_NAME,
        metadata: JSON.stringify(opts.metadata),
      }),
    ],
  });
  return at.toJwt();
}
