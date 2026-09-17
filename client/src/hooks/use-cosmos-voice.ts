import { useCallback, useEffect, useRef, useState } from "react";
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type Participant,
  type RpcInvocationData,
} from "livekit-client";
import { COSMOS_RPC, parseRpcAction, type CosmosClientAction, type CosmosScreenContext } from "@shared/cosmosAgent";

export type CosmosVoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";

function mapLiveKitAgentState(raw: string | undefined): CosmosVoiceState | null {
  switch (raw) {
    case "speaking":
      return "speaking";
    case "thinking":
      return "thinking";
    case "listening":
    case "idle":
      return "listening";
    case "connecting":
    case "pre-connect-buffering":
    case "initializing":
      return "connecting";
    case "failed":
      return "error";
    default:
      return null;
  }
}

function findAgentParticipant(room: Room): Participant | undefined {
  return Array.from(room.remoteParticipants.values()).find(
    (p) => p.isAgent || p.attributes["lk.agent.state"] !== undefined
  );
}

type VoiceTokenResponse = {
  token: string;
  url: string;
  roomName: string;
  sessionId: string;
  identity: string;
};

type Options = {
  currentPlanId?: string;
  screen?: CosmosScreenContext;
  onAction: (action: CosmosClientAction) => void;
  onTranscript: (role: "user" | "assistant", text: string, isFinal: boolean) => void;
};

export function useCosmosVoice({ currentPlanId, screen, onAction, onTranscript }: Options) {
  const [state, setState] = useState<CosmosVoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [micEnabled, setMicEnabledState] = useState(true);
  const [canPlayAudio, setCanPlayAudio] = useState(true);
  const roomRef = useRef<Room | null>(null);
  const startIdRef = useRef(0);
  const onActionRef = useRef(onAction);
  const onTranscriptRef = useRef(onTranscript);
  const screenRef = useRef(screen);
  onActionRef.current = onAction;
  onTranscriptRef.current = onTranscript;
  screenRef.current = screen;

  const unlockAudio = useCallback(async () => {
    const current = roomRef.current;
    if (!current) return;
    try {
      await current.startAudio();
      setCanPlayAudio(current.canPlaybackAudio);
    } catch {
      setCanPlayAudio(false);
    }
  }, []);

  const setMicEnabled = useCallback(async (enabled: boolean) => {
    const current = roomRef.current;
    if (!current) return;
    try {
      await current.localParticipant.setMicrophoneEnabled(enabled);
      setMicEnabledState(enabled);
      await unlockAudio();
    } catch {
      /* ignore */
    }
  }, [unlockAudio]);

  const stop = useCallback(async () => {
    startIdRef.current += 1;
    const current = roomRef.current;
    roomRef.current = null;
    setRoom(null);
    setState("idle");
    setMicEnabledState(true);
    setCanPlayAudio(true);
    if (!current) return;
    try {
      await current.localParticipant.setMicrophoneEnabled(false);
    } catch {
      /* ignore */
    }
    current.disconnect();
  }, []);

  const start = useCallback(async () => {
    if (roomRef.current) return;
    const startId = startIdRef.current + 1;
    startIdRef.current = startId;
    setError(null);
    setMicEnabledState(true);
    setCanPlayAudio(true);
    setState("connecting");

    const res = await fetch("/api/cosmos/voice/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ currentPlanId, channel: "voice", screen: screenRef.current }),
    });
    if (startIdRef.current !== startId) return;
    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: `Error ${res.status}` }));
      setError(typeof body.message === "string" ? body.message : "No se pudo iniciar la voz");
      setState("error");
      return;
    }
    const data = (await res.json()) as VoiceTokenResponse;
    if (startIdRef.current !== startId) return;
    const nextRoom = new Room({ adaptiveStream: true, dynacast: true, webAudioMix: true });
    roomRef.current = nextRoom;

    const handleRpc = async (method: string, data: RpcInvocationData) => {
      const action = parseRpcAction(method, data.payload);
      if (!action) return JSON.stringify({ ok: false });
      onActionRef.current(action);
      return JSON.stringify({ ok: true });
    };
    nextRoom.registerRpcMethod(COSMOS_RPC.openPlan, (d) => handleRpc(COSMOS_RPC.openPlan, d));
    nextRoom.registerRpcMethod(COSMOS_RPC.startQuote, (d) => handleRpc(COSMOS_RPC.startQuote, d));
    nextRoom.registerRpcMethod(COSMOS_RPC.action, (d) => handleRpc(COSMOS_RPC.action, d));

    const applyAgentState = (participant?: Participant) => {
      const mapped = mapLiveKitAgentState(participant?.attributes["lk.agent.state"]);
      if (!mapped) return;
      setState((prev) => {
        if (prev === "error" || prev === "idle") return prev;
        if (mapped === "connecting" && prev !== "connecting") return prev;
        return mapped;
      });
    };

    nextRoom.on(RoomEvent.TranscriptionReceived, (segments, participant) => {
      const text = segments.map((s) => s.text).join(" ").trim();
      if (!text) return;
      const isFinal = segments.every((s) => s.final);
      const isAgent = Boolean(participant?.isAgent);
      onTranscriptRef.current(isAgent ? "assistant" : "user", text, isFinal);
    });
    nextRoom.on(RoomEvent.ParticipantAttributesChanged, (_changed, participant) => {
      applyAgentState(participant);
    });
    nextRoom.on(RoomEvent.ParticipantConnected, (participant) => {
      applyAgentState(participant);
    });
    nextRoom.on(RoomEvent.Disconnected, () => {
      if (roomRef.current === nextRoom) {
        roomRef.current = null;
        setRoom(null);
      }
      setState("idle");
    });
    nextRoom.on(RoomEvent.AudioPlaybackStatusChanged, () => {
      setCanPlayAudio(nextRoom.canPlaybackAudio);
    });
    nextRoom.on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind !== Track.Kind.Audio) return;
      void nextRoom.startAudio().then(
        () => setCanPlayAudio(nextRoom.canPlaybackAudio),
        () => setCanPlayAudio(false)
      );
    });

    try {
      await nextRoom.connect(data.url, data.token);
      if (startIdRef.current !== startId) {
        nextRoom.disconnect();
        if (roomRef.current === nextRoom) roomRef.current = null;
        return;
      }
      // getUserMedia desbloquea el autoplay en la mayoría de navegadores.
      await nextRoom.localParticipant.setMicrophoneEnabled(true);
      try {
        await nextRoom.startAudio();
        setCanPlayAudio(nextRoom.canPlaybackAudio);
      } catch {
        setCanPlayAudio(false);
      }
      if (startIdRef.current !== startId) {
        nextRoom.disconnect();
        if (roomRef.current === nextRoom) roomRef.current = null;
        return;
      }
      setRoom(nextRoom);
      setState("listening");
      applyAgentState(findAgentParticipant(nextRoom));

      const agentHere = Boolean(findAgentParticipant(nextRoom));
      if (!agentHere) {
        const timeout = window.setTimeout(() => {
          if (roomRef.current !== nextRoom) return;
          if (!findAgentParticipant(nextRoom)) {
            setError(
              "No se pudo abrir la voz. En local hace falta el proceso `npm run cosmos:agent`."
            );
            setState("error");
            void stop();
          }
        }, 20000);
        nextRoom.once(RoomEvent.ParticipantConnected, (p) => {
          if (p.isAgent || p.attributes["lk.agent.state"] !== undefined) {
            window.clearTimeout(timeout);
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo conectar la voz");
      setState("error");
      nextRoom.disconnect();
      roomRef.current = null;
      setRoom(null);
    }
  }, [currentPlanId, stop]);

  useEffect(() => {
    const room = roomRef.current;
    if (!room) return;
    const onConn = () => {
      if (room.state === ConnectionState.Disconnected) setState("idle");
    };
    room.on(RoomEvent.ConnectionStateChanged, onConn);
    return () => {
      room.off(RoomEvent.ConnectionStateChanged, onConn);
    };
  }, [state]);

  useEffect(() => {
    return () => {
      void stop();
    };
  }, [stop]);

  return { state, error, room, micEnabled, canPlayAudio, setMicEnabled, unlockAudio, start, stop };
}
