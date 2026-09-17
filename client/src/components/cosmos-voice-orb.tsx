import { useEffect, useState } from "react";
import {
  RoomEvent,
  Track,
  type LocalAudioTrack,
  type RemoteAudioTrack,
  type Room,
} from "livekit-client";
import type { AgentState } from "@livekit/components-react";
import { AgentAudioVisualizerAura } from "@/components/agents-ui/agent-audio-visualizer-aura";
import { cn } from "@/lib/utils";
import type { CosmosVoiceState } from "@/hooks/use-cosmos-voice";

type Size = "mini" | "stage";

type Props = {
  room: Room | null;
  state: CosmosVoiceState;
  size?: Size;
  className?: string;
};

/** Naranja Cosmos (hsl 24 95% 48%). */
const COSMOS_AURA_COLOR = "#F07814" as const;

function toAgentState(state: CosmosVoiceState): AgentState {
  switch (state) {
    case "speaking":
      return "speaking";
    case "thinking":
      return "thinking";
    case "listening":
      return "listening";
    case "connecting":
      return "connecting";
    case "error":
      return "failed";
    default:
      return "idle";
  }
}

function pickAuraTrack(
  room: Room,
  state: CosmosVoiceState
): LocalAudioTrack | RemoteAudioTrack | undefined {
  if (state === "speaking") {
    const participants = Array.from(room.remoteParticipants.values());
    for (const participant of participants) {
      if (!participant.isAgent && participant.attributes["lk.agent.state"] === undefined) continue;
      const pubs = Array.from(participant.audioTrackPublications.values());
      for (const pub of pubs) {
        if (pub.track) return pub.track as RemoteAudioTrack;
      }
    }
  }
  const mic = room.localParticipant.getTrackPublication(Track.Source.Microphone);
  return mic?.track as LocalAudioTrack | undefined;
}

/**
 * Orbe Aura oficial de LiveKit Agents UI.
 * Reacciona al estado del agente y al volumen del track activo.
 */
export function CosmosVoiceOrb({ room, state, size = "stage", className }: Props) {
  const [audioTrack, setAudioTrack] = useState<LocalAudioTrack | RemoteAudioTrack | undefined>();

  useEffect(() => {
    if (!room) {
      setAudioTrack(undefined);
      return;
    }
    const sync = () => setAudioTrack(pickAuraTrack(room, state));
    sync();
    room.on(RoomEvent.TrackSubscribed, sync);
    room.on(RoomEvent.TrackUnsubscribed, sync);
    room.on(RoomEvent.LocalTrackPublished, sync);
    room.on(RoomEvent.LocalTrackUnpublished, sync);
    return () => {
      room.off(RoomEvent.TrackSubscribed, sync);
      room.off(RoomEvent.TrackUnsubscribed, sync);
      room.off(RoomEvent.LocalTrackPublished, sync);
      room.off(RoomEvent.LocalTrackUnpublished, sync);
    };
  }, [room, state]);

  return (
    <AgentAudioVisualizerAura
      size={size === "mini" ? "sm" : "lg"}
      state={toAgentState(state)}
      audioTrack={audioTrack}
      color={COSMOS_AURA_COLOR}
      colorShift={0.16}
      themeMode="dark"
      className={cn(
        "pointer-events-none bg-transparent",
        size === "stage" && "h-[260px] w-[260px]",
        className
      )}
      aria-hidden
    />
  );
}
