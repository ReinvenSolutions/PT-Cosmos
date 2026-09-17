import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { RoomAudioRenderer, RoomContext } from "@livekit/components-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CosmosVoiceOrb } from "@/components/cosmos-voice-orb";
import { CosmosVoiceStage } from "@/components/cosmos-voice-stage";
import { CosmosProposalCard, type CosmosProposal } from "@/components/cosmos-proposal-card";
import { useCosmosVoice, type CosmosVoiceState } from "@/hooks/use-cosmos-voice";
import type { CosmosClientAction, CosmosScreenContext } from "@shared/cosmosAgent";

const COSMOS_ASSISTANT_GRADIENT =
  "bg-gradient-to-br from-[hsl(24,95%,48%)] to-[hsl(32,92%,58%)]";
const COSMOS_ASSISTANT_SHADOW = "shadow-orange-500/30";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  proposals?: CosmosProposal[];
};

type Props = {
  open: boolean;
  currentPlanId?: string;
  screen?: CosmosScreenContext;
  messages: ChatMessage[];
  interimVoice: string | null;
  showTranscript: boolean;
  onOpenChange: (open: boolean) => void;
  onAction: (action: CosmosClientAction) => void;
  onAcceptProposal: (messageId: string, proposalId: string) => void;
  onDismissProposal: (messageId: string, proposalId: string) => void;
  onTranscript: (role: ChatRole, text: string, isFinal: boolean) => void;
  onInterim: (text: string | null) => void;
  onHangUp: () => void;
  onToggleTranscript: () => void;
};

function liveCaption(messages: ChatMessage[], interim: string | null, state: CosmosVoiceState): string | null {
  const raw = (() => {
    if (interim?.trim()) return interim.trim();
    const last = [...messages].reverse().find((m) => m.content.trim());
    if (!last) return null;
    if (state === "speaking" && last.role === "assistant") return last.content;
    if ((state === "listening" || state === "thinking") && last.role === "user") return last.content;
    return null;
  })();
  if (!raw) return null;
  return raw.length > 160 ? `${raw.slice(0, 159)}…` : raw;
}

/** Carga LiveKit/shaders solo cuando el usuario inicia voz. Un solo mount = una sola Room. */
export function CosmosVoiceRuntime({
  open,
  currentPlanId,
  screen,
  messages,
  interimVoice,
  showTranscript,
  onOpenChange,
  onAction,
  onAcceptProposal,
  onDismissProposal,
  onTranscript,
  onInterim,
  onHangUp,
  onToggleTranscript,
}: Props) {
  const { state, error, room, micEnabled, canPlayAudio, setMicEnabled, unlockAudio, start, stop } = useCosmosVoice({
    currentPlanId,
    screen,
    onAction,
    onTranscript: (role, text, isFinal) => {
      if (!isFinal) {
        onInterim(role === "user" ? text : null);
        return;
      }
      onInterim(null);
      onTranscript(role, text, isFinal);
    },
  });

  useEffect(() => {
    void start();
  }, [start]);

  const hangUp = () => {
    void stop();
    onHangUp();
  };

  return (
    <>
      {room ? (
        <RoomContext.Provider value={room}>
          <RoomAudioRenderer />
        </RoomContext.Provider>
      ) : null}
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-orange-500/20"
            role="dialog"
            aria-label="Llamada de voz con Cosmos"
          >
            <CosmosVoiceStage
              room={room}
              state={state}
              error={error}
              micEnabled={micEnabled}
              canPlayAudio={canPlayAudio}
              caption={liveCaption(messages, interimVoice, state)}
              showTranscript={showTranscript}
              transcript={messages}
              onToggleMic={() => void setMicEnabled(!micEnabled)}
              onUnlockAudio={() => void unlockAudio()}
              onBackToChat={hangUp}
              onMinimize={() => onOpenChange(false)}
              onToggleTranscript={onToggleTranscript}
            />
            {messages.some((m) => m.proposals?.some((p) => p.status === "pending")) && (
              <div className="space-y-2 bg-zinc-950/80 px-3 py-2">
                {messages.flatMap((m) =>
                  (m.proposals ?? [])
                    .filter((p) => p.status === "pending")
                    .map((p) => (
                      <CosmosProposalCard
                        key={p.id}
                        proposal={p}
                        onAccept={() => onAcceptProposal(m.id, p.id)}
                        onDismiss={() => onDismissProposal(m.id, p.id)}
                      />
                    ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        type="button"
        size="lg"
        className={cn(
          "pointer-events-auto relative h-14 w-14 overflow-hidden rounded-full shadow-lg text-white hover:opacity-95 transition-transform",
          open
            ? cn(COSMOS_ASSISTANT_GRADIENT, COSMOS_ASSISTANT_SHADOW, "scale-95")
            : "bg-zinc-950 p-0 ring-2 ring-orange-400/70 shadow-orange-500/40",
        )}
        onClick={() => {
          if (!open) void unlockAudio();
          onOpenChange(!open);
        }}
        aria-expanded={open}
        aria-label={open ? "Minimizar llamada de Cosmos" : "Volver a la llamada de Cosmos"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <CosmosVoiceOrb room={room} state={state} size="mini" />
        )}
      </Button>
    </div>
    </>
  );
}
