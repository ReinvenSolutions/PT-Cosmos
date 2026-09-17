import { AnimatePresence, motion } from "framer-motion";
import { Captions, MessageCircle, Mic, MicOff, Minimize2, Sparkles, Volume2 } from "lucide-react";
import type { Room } from "livekit-client";
import { Button } from "@/components/ui/button";
import { CosmosVoiceOrb } from "@/components/cosmos-voice-orb";
import { cn } from "@/lib/utils";
import type { CosmosVoiceState } from "@/hooks/use-cosmos-voice";

type Props = {
  room: Room | null;
  state: CosmosVoiceState;
  error: string | null;
  micEnabled: boolean;
  canPlayAudio: boolean;
  caption: string | null;
  showTranscript: boolean;
  onToggleMic: () => void;
  onUnlockAudio: () => void;
  onBackToChat: () => void;
  onMinimize: () => void;
  onToggleTranscript: () => void;
  transcript: Array<{ id: string; role: "user" | "assistant"; content: string }>;
};

function headerStatus(state: CosmosVoiceState): string {
  switch (state) {
    case "connecting":
      return "Abriendo voz";
    case "thinking":
      return "Pensando";
    case "speaking":
      return "Hablando";
    case "error":
      return "Sin audio";
    default:
      return "Te estoy escuchando";
  }
}

function statusCopy(state: CosmosVoiceState, micEnabled: boolean): { title: string; hint: string } {
  if (!micEnabled && (state === "listening" || state === "thinking")) {
    return { title: "Micrófono silenciado", hint: "Actívalo para seguir hablando" };
  }
  switch (state) {
    case "connecting":
      return { title: "Un segundo…", hint: "Activando el micrófono" };
    case "thinking":
      return { title: "Pensando", hint: "Un momento" };
    case "speaking":
      return { title: "Cosmos te habla", hint: "Puedes interrumpir cuando quieras" };
    case "error":
      return { title: "No se pudo abrir la voz", hint: "Vuelve al chat o reintenta" };
    case "listening":
    default:
      return { title: "Te estoy escuchando", hint: "Habla cuando quieras" };
  }
}

export function CosmosVoiceStage({
  room,
  state,
  error,
  micEnabled,
  canPlayAudio,
  caption,
  showTranscript,
  onToggleMic,
  onUnlockAudio,
  onBackToChat,
  onMinimize,
  onToggleTranscript,
  transcript,
}: Props) {
  const copy = statusCopy(state, micEnabled);
  const recent = transcript.filter((m) => m.content.trim()).slice(-6);

  return (
    <div
      className="flex min-h-[min(72vh,520px)] flex-col bg-[#09090b] text-white"
      onPointerDown={() => {
        if (!canPlayAudio) onUnlockAudio();
      }}
    >
      <header className="flex items-center gap-3 px-4 pt-3 pb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
          <Sparkles className="h-3.5 w-3.5 text-orange-300" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">Cosmos</p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span
              className={cn(
                "inline-block h-1.5 w-1.5 rounded-full",
                state === "error" ? "bg-red-400" : "bg-emerald-400 animate-pulse"
              )}
            />
            {headerStatus(state)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={onMinimize}
          aria-label="Minimizar voz"
        >
          <Minimize2 className="h-4 w-4" />
        </Button>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center px-5 pb-2 pt-4">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(249,115,22,0.18),transparent_58%)]"
          aria-hidden
        />
        <div className="relative z-10">
          <CosmosVoiceOrb room={room} state={state} size="stage" />
        </div>
        <p className="relative z-10 mt-4 text-sm font-medium tracking-wide text-white/90">{copy.title}</p>
        <p className="relative z-10 mt-0.5 text-[11px] text-white/45">{copy.hint}</p>

        {!canPlayAudio && state !== "error" && state !== "connecting" && (
          <Button
            type="button"
            className="relative z-10 mt-4 h-10 rounded-full bg-white px-4 text-sm font-medium text-zinc-950 hover:bg-white/90"
            onClick={onUnlockAudio}
          >
            <Volume2 className="mr-2 h-4 w-4" />
            Toca para escuchar a Cosmos
          </Button>
        )}

        <div className="relative z-10 mt-4 flex min-h-[3.25rem] w-full items-center justify-center px-2">
          <AnimatePresence mode="wait">
            {(caption || error) && (
              <motion.p
                key={error ?? caption}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  "max-w-full text-center text-[13px] leading-relaxed",
                  error ? "text-red-300" : "text-white/75"
                )}
              >
                {error ?? caption}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showTranscript && recent.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/10"
          >
            <div className="max-h-28 space-y-1.5 overflow-y-auto px-4 py-2">
              {recent.map((m) => (
                <p
                  key={m.id}
                  className={cn(
                    "text-[11px] leading-snug",
                    m.role === "user" ? "text-white/50" : "text-white/80"
                  )}
                >
                  <span className="font-medium text-white/40">
                    {m.role === "user" ? "Tú · " : "Cosmos · "}
                  </span>
                  {m.content}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-center gap-5 px-4 pb-5 pt-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white/55 hover:bg-white/10 hover:text-white"
          onClick={onToggleTranscript}
          aria-label={showTranscript ? "Ocultar transcripción" : "Ver transcripción"}
          title="Transcripción"
        >
          <Captions className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={cn(
            "h-12 w-12 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20",
            !micEnabled && "bg-red-500/90 text-white hover:bg-red-500 border-red-400/40"
          )}
          onClick={onToggleMic}
          disabled={state === "connecting"}
          aria-label={micEnabled ? "Silenciar micrófono" : "Activar micrófono"}
        >
          {micEnabled ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-12 w-12 rounded-full border border-white/15 bg-white/10 text-white hover:bg-white/20"
          onClick={onBackToChat}
          aria-label="Volver al chat"
          title="Volver al chat"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
