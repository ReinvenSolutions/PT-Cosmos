import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessCosmos, canAccessCosmosVoice } from "@shared/modules";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Mic, Send, Sparkles, X, Minimize2 } from "lucide-react";
import { applyCosmosClientAction, applyCosmosExecutableAction } from "@/lib/cosmos-actions";
import { buildCosmosScreenContext } from "@/lib/cosmos-screen";
import { CosmosProposalCard, type CosmosProposal } from "@/components/cosmos-proposal-card";
import { isCosmosProposal, type CosmosClientAction } from "@shared/cosmosAgent";

const CosmosVoiceRuntime = lazy(() =>
  import("@/components/cosmos-voice-runtime").then((m) => ({ default: m.CosmosVoiceRuntime })),
);

type CosmosVoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking" | "error";
const COSMOS_ASSISTANT_GRADIENT =
  "bg-gradient-to-br from-[hsl(24,95%,48%)] to-[hsl(32,92%,58%)]";
const COSMOS_ASSISTANT_GRADIENT_R =
  "bg-gradient-to-r from-[hsl(24,95%,48%)] to-[hsl(32,92%,58%)]";
const COSMOS_ASSISTANT_SHADOW = "shadow-orange-500/30";

const NUDGE_FIRST_MS = 30_000;
const NUDGE_INTERVAL_MS = 5 * 60_000;
const NUDGE_MESSAGE =
  "Soy Cosmos, tu asistente virtual. ¿Puedo ayudarte en algo?";

/** Si el usuario está a esta distancia (px) del final, el autoscroll sigue activo. */
const SCROLL_NEAR_BOTTOM_PX = 80;

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  proposals?: CosmosProposal[];
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function voiceStatusLabel(state: CosmosVoiceState): string {
  switch (state) {
    case "connecting":
      return "Conectando voz…";
    case "thinking":
      return "Cosmos está pensando…";
    case "speaking":
      return "Cosmos te habla";
    case "listening":
      return "Te estoy escuchando · planes y cotizaciones";
    case "error":
      return "Error de voz";
    default:
      return "Asistente IA";
  }
}

function firstName(user: { name?: string | null; username: string }): string {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return user.username;
}

async function streamCosmosReply(
  messages: Array<{ role: ChatRole; content: string }>,
  currentPlanId: string | undefined,
  sessionId: string | undefined,
  screen: ReturnType<typeof buildCosmosScreenContext>,
  onChunk: (text: string) => void,
  onEvent: (event: { sessionId?: string; action?: CosmosClientAction }) => void
): Promise<void> {
  const res = await fetch("/api/cosmos/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, currentPlanId, sessionId, screen }),
  });

  if (!res.ok) {
    const text = await res.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.message || json.error || text;
    } catch {
      /* use text */
    }
    throw new Error(message || `Error ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("Respuesta vacía del servidor");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";
    for (const part of parts) {
      const line = part.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.replace(/^data:\s*/, "");
      try {
        const data = JSON.parse(payload) as {
          content?: string;
          done?: boolean;
          error?: string;
          sessionId?: string;
          action?: CosmosClientAction;
        };
        if (data.error) throw new Error(data.error);
        if (data.sessionId || data.action) onEvent({ sessionId: data.sessionId, action: data.action });
        if (data.content) onChunk(data.content);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

/** Enlaces markdown [texto](url) y URLs sueltas en respuestas del asistente. */
const LINK_OR_URL_RE = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s<>\]]+)/g;

function renderInlineFormatting(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const boldRe = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = boldRe.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <strong key={`${keyPrefix}-b-${i++}`} className="font-semibold">
        {m[1]}
      </strong>
    );
    last = boldRe.lastIndex;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

function renderMessageContent(content: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  LINK_OR_URL_RE.lastIndex = 0;
  while ((match = LINK_OR_URL_RE.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const segment = content.slice(lastIndex, match.index);
      nodes.push(...renderInlineFormatting(segment, `t-${key}`));
    }

    if (match[1] !== undefined && match[2] !== undefined) {
      const label = match[1];
      const href = match[2];
      nodes.push(
        <a
          key={`link-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2 decoration-primary/50 hover:decoration-primary break-all"
        >
          {label}
        </a>
      );
    } else if (match[3]) {
      const href = match[3];
      nodes.push(
        <a
          key={`url-${key++}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline underline-offset-2 decoration-primary/50 hover:decoration-primary break-all"
        >
          {href}
        </a>
      );
    }

    lastIndex = LINK_OR_URL_RE.lastIndex;
  }

  if (lastIndex < content.length) {
    nodes.push(...renderInlineFormatting(content.slice(lastIndex), `end-${key}`));
  }

  return nodes.length ? nodes : [content];
}

function MessageBubble({
  role,
  content,
  proposals,
  onAcceptProposal,
  onDismissProposal,
}: {
  role: ChatRole;
  content: string;
  proposals?: CosmosProposal[];
  onAcceptProposal?: (id: string) => void;
  onDismissProposal?: (id: string) => void;
}) {
  const isUser = role === "user";
  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
            COSMOS_ASSISTANT_GRADIENT
          )}
          aria-hidden
        >
          <Sparkles className="h-3.5 w-3.5" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[82%] min-w-0 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md shadow-sm"
            : "bg-muted/70 text-foreground rounded-bl-md border border-border/60"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{content}</p>
        ) : (
          <div className="space-y-2">
            <div className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {renderMessageContent(content)}
            </div>
            {proposals?.map((p) => (
              <CosmosProposalCard
                key={p.id}
                proposal={p}
                onAccept={() => onAcceptProposal?.(p.id)}
                onDismiss={() => onDismissProposal?.(p.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CosmosChatWidget() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const [voiceDisabledReason, setVoiceDisabledReason] = useState<
    "openai" | "livekit" | "module" | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const [interimVoice, setInterimVoice] = useState<string | null>(null);
  const [showVoiceTranscript, setShowVoiceTranscript] = useState(false);
  const [voiceWanted, setVoiceWanted] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const greetedRef = useRef(false);
  const openRef = useRef(open);
  const pendingNudgeRef = useRef(false);
  const sessionIdRef = useRef<string | undefined>(undefined);
  const voiceDraftsRef = useRef<{ user?: string; assistant?: string }>({});
  openRef.current = open;

  const handleViewportScroll = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickToBottomRef.current = distanceFromBottom <= SCROLL_NEAR_BOTTOM_PX;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const planMatch = location.match(/^\/plan\/([^/]+)/);
  const currentPlanId = planMatch?.[1];

  useEffect(() => {
    if (!user || !canAccessCosmos(user)) return;

    let cancelled = false;
    fetch("/api/cosmos/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((data: { available?: boolean; voiceAvailable?: boolean; voiceDisabledReason?: "openai" | "livekit" | "module" | null }) => {
        if (!cancelled) {
          setAvailable(Boolean(data.available));
          setVoiceAvailable(Boolean(data.voiceAvailable));
          setVoiceDisabledReason(data.voiceDisabledReason ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || available !== true) return;

    const showNudge = () => {
      if (openRef.current) {
        pendingNudgeRef.current = true;
      } else {
        setNudgeVisible(true);
      }
    };

    const firstTimer = window.setTimeout(showNudge, NUDGE_FIRST_MS);
    const intervalId = window.setInterval(showNudge, NUDGE_INTERVAL_MS);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearInterval(intervalId);
    };
  }, [user, available]);

  useEffect(() => {
    if (open) {
      setNudgeVisible(false);
      return;
    }
    if (pendingNudgeRef.current) {
      pendingNudgeRef.current = false;
      setNudgeVisible(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !user || greetedRef.current) return;
    greetedRef.current = true;
    const name = firstName(user);
    setMessages([
      {
        id: newId(),
        role: "assistant",
        content: `¡Hola ${name}! Soy Cosmos, tu asistente cotizador. Puedo buscar planes, abrir fichas, armar el borrador de cotización, revisar tus cotizaciones y clientes, y guiarte por la plataforma.\n¿En qué te acompaño hoy?`,
      },
    ]);
  }, [open, user]);

  useLayoutEffect(() => {
    if (!open) return;
    if (stickToBottomRef.current) {
      scrollToBottom("auto");
    }
  }, [messages, loading, error, open, scrollToBottom]);

  useLayoutEffect(() => {
    if (!open) return;
    stickToBottomRef.current = true;
    scrollToBottom("auto");
  }, [open, scrollToBottom]);

  const applyAction = useCallback(
    (action: CosmosClientAction) => {
      if (isCosmosProposal(action)) return;
      applyCosmosClientAction(action, setLocation);
    },
    [setLocation]
  );

  const acceptProposal = useCallback(
    (messageId: string, proposalId: string) => {
      setMessages((prev) => {
        const msg = prev.find((m) => m.id === messageId);
        const proposal = msg?.proposals?.find((p) => p.id === proposalId);
        if (proposal?.status === "pending") {
          applyCosmosExecutableAction(proposal.action, setLocation);
        }
        return prev.map((m) =>
          m.id !== messageId
            ? m
            : {
                ...m,
                proposals: m.proposals?.map((p) =>
                  p.id === proposalId ? { ...p, status: "accepted" as const } : p
                ),
              }
        );
      });
    },
    [setLocation]
  );

  const dismissProposal = useCallback((messageId: string, proposalId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id !== messageId
          ? m
          : {
              ...m,
              proposals: m.proposals?.map((p) =>
                p.id === proposalId ? { ...p, status: "dismissed" as const } : p
              ),
            }
      )
    );
  }, []);

  const commitVoiceTranscript = useCallback((role: ChatRole, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const draftId = voiceDraftsRef.current[role];
    if (draftId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === draftId ? { ...m, content: trimmed } : m))
      );
      voiceDraftsRef.current[role] = undefined;
      return;
    }
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === role && last.content === trimmed) return prev;
      return [...prev, { id: newId(), role, content: trimmed }];
    });
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !available) return;

    stickToBottomRef.current = true;
    setError(null);
    const userMsg: ChatMessage = { id: newId(), role: "user", content: text };
    const assistantId = newId();
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "" }]);
    setInput("");
    setLoading(true);

    const apiMessages = [...messages.filter((m) => m.content), userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      let accumulated = "";
      await streamCosmosReply(
        apiMessages,
        currentPlanId,
        sessionIdRef.current,
        buildCosmosScreenContext(location),
        (chunk) => {
          accumulated += chunk;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
        },
        (event) => {
          if (event.sessionId) sessionIdRef.current = event.sessionId;
          if (!event.action) return;
          if (isCosmosProposal(event.action)) {
            const proposal: CosmosProposal = {
              id: newId(),
              label: event.action.label,
              action: event.action.action,
              status: "pending",
            };
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, proposals: [...(m.proposals ?? []), proposal] }
                  : m
              )
            );
            return;
          }
          applyAction(event.action);
        }
      );
      if (!accumulated.trim()) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Disculpa, no pude generar una respuesta. ¿Puedes intentar de nuevo?" }
              : m
          )
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de conexión";
      setError(msg);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }, [input, loading, available, messages, currentPlanId, applyAction, location]);

  const addProposal = useCallback((action: Extract<CosmosClientAction, { type: "propose_action" }>) => {
    const proposal: CosmosProposal = {
      id: newId(),
      label: action.label,
      action: action.action,
      status: "pending",
    };
    setMessages((prev) => {
      const last = [...prev].reverse().find((m) => m.role === "assistant");
      if (!last) {
        return [...prev, { id: newId(), role: "assistant", content: "", proposals: [proposal] }];
      }
      return prev.map((m) =>
        m.id === last.id ? { ...m, proposals: [...(m.proposals ?? []), proposal] } : m
      );
    });
  }, []);

  const handleIncomingAction = useCallback(
    (action: CosmosClientAction) => {
      if (isCosmosProposal(action)) {
        addProposal(action);
        return;
      }
      applyAction(action);
    },
    [addProposal, applyAction]
  );

  const showVoice = canAccessCosmosVoice(user);
  const voiceHint =
    voiceDisabledReason === "livekit"
      ? "Falta LIVEKIT_URL, LIVEKIT_API_KEY y LIVEKIT_API_SECRET en Railway"
      : voiceDisabledReason === "module"
        ? "Activa Cosmos voz en Admin → Usuarios"
        : voiceDisabledReason === "openai"
          ? "Falta OPENAI_API_KEY en el servidor"
          : "Hablar con Cosmos";

  useEffect(() => {
    if (!user || !canAccessCosmos(user) || available === false) {
      setVoiceWanted(false);
    }
  }, [user, available]);

  if (!user || !canAccessCosmos(user) || available === false) return null;

  if (voiceWanted) {
    return (
      <Suspense fallback={null}>
        <CosmosVoiceRuntime
          open={open}
          currentPlanId={currentPlanId}
          screen={buildCosmosScreenContext(location)}
          messages={messages}
          interimVoice={interimVoice}
          showTranscript={showVoiceTranscript}
          onOpenChange={setOpen}
          onAction={handleIncomingAction}
          onAcceptProposal={(messageId, proposalId) => acceptProposal(messageId, proposalId)}
          onDismissProposal={(messageId, proposalId) => dismissProposal(messageId, proposalId)}
          onTranscript={commitVoiceTranscript}
          onInterim={setInterimVoice}
          onHangUp={() => {
            setShowVoiceTranscript(false);
            setVoiceWanted(false);
            setOpen(true);
          }}
          onToggleTranscript={() => setShowVoiceTranscript((v) => !v)}
        />
      </Suspense>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex w-[min(100vw-2rem,400px)] flex-col overflow-hidden rounded-3xl border border-border/80 bg-background shadow-2xl shadow-orange-500/15"
            role="dialog"
            aria-label="Chat con Cosmos"
          >
            <header
              className={cn(
                "flex items-center gap-3 border-b px-4 py-3 text-white",
                COSMOS_ASSISTANT_GRADIENT_R
              )}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
                <Sparkles className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm leading-tight">Cosmos</p>
                <p className="text-[11px] text-white/85 truncate">
                  {voiceStatusLabel("idle")}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-white hover:bg-white/20"
                onClick={() => setOpen(false)}
                aria-label="Minimizar chat"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </header>

            <div
              ref={viewportRef}
              className="h-[min(52vh,420px)] overflow-y-auto overscroll-contain"
              onScroll={handleViewportScroll}
            >
              <div className="space-y-3 p-4">
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    role={m.role}
                    content={m.content}
                    proposals={m.proposals}
                    onAcceptProposal={(id) => acceptProposal(m.id, id)}
                    onDismissProposal={(id) => dismissProposal(m.id, id)}
                  />
                ))}
                {loading && messages[messages.length - 1]?.content === "" && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm px-1">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cosmos está escribiendo…
                  </div>
                )}
                {error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                    {error}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t bg-muted/30 p-3 space-y-2">
              {currentPlanId && (
                <p className="text-[10px] text-muted-foreground px-0.5">
                  Contexto: plan actual en pantalla
                </p>
              )}
              <div className="flex gap-2 items-end">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                  placeholder={available ? "Escribe tu consulta…" : "Cosmos no disponible"}
                  disabled={!available || loading}
                  rows={2}
                  className="min-h-[44px] max-h-28 resize-none text-sm bg-background"
                  aria-label="Mensaje para Cosmos"
                />
                {showVoice && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className={cn(
                      "shrink-0 h-10 w-10 rounded-xl",
                      !voiceAvailable && "opacity-60"
                    )}
                    disabled={!available}
                    onClick={() => {
                      if (!voiceAvailable) {
                        setError(voiceHint);
                        return;
                      }
                      setError(null);
                      setOpen(true);
                      setVoiceWanted(true);
                    }}
                    aria-label="Hablar con Cosmos"
                    title={voiceHint}
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  type="button"
                  size="icon"
                  className={cn("shrink-0 h-10 w-10 rounded-xl text-white", COSMOS_ASSISTANT_GRADIENT)}
                  disabled={!available || loading || !input.trim()}
                  onClick={() => void sendMessage()}
                  aria-label="Enviar mensaje"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              {showVoice && !voiceAvailable && (
                <p className="text-[10px] text-muted-foreground px-0.5 leading-snug">{voiceHint}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {nudgeVisible && !open && (
        <div
          className="pointer-events-auto relative max-w-[min(100vw-6rem,260px)] animate-in fade-in slide-in-from-bottom-2 duration-300"
          role="status"
          aria-live="polite"
        >
          <button
            type="button"
            className={cn(
              "w-full rounded-2xl px-3.5 py-2.5 text-left text-sm text-white shadow-lg pr-9 transition-opacity hover:opacity-95",
              COSMOS_ASSISTANT_GRADIENT_R
            )}
            onClick={() => {
              setNudgeVisible(false);
              setOpen(true);
            }}
          >
            <p className="leading-snug">{NUDGE_MESSAGE}</p>
          </button>
          <button
            type="button"
            className="absolute right-2 top-2 z-10 rounded-md p-0.5 text-white/80 hover:bg-white/20 hover:text-white"
            onClick={() => setNudgeVisible(false)}
            aria-label="Cerrar mensaje de Cosmos"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div
            className={cn(
              "absolute -bottom-1.5 right-6 h-3 w-3 rotate-45",
              COSMOS_ASSISTANT_GRADIENT
            )}
            aria-hidden
          />
        </div>
      )}

      <Button
        type="button"
        size="lg"
        className={cn(
          "pointer-events-auto relative h-14 w-14 overflow-hidden rounded-full shadow-lg text-white hover:opacity-95 transition-transform",
          COSMOS_ASSISTANT_GRADIENT,
          COSMOS_ASSISTANT_SHADOW,
          open && "scale-95"
        )}
        onClick={() => {
          setNudgeVisible(false);
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        aria-label={open ? "Cerrar chat Cosmos" : "Abrir chat Cosmos"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
