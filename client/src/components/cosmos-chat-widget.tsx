import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Send, Sparkles, X, Minimize2 } from "lucide-react";

/** Identidad visual del asistente Cosmos (naranja en gradiente). */
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
};

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function firstName(user: { name?: string | null; username: string }): string {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return user.username;
}

async function streamCosmosReply(
  messages: Array<{ role: ChatRole; content: string }>,
  currentPlanId: string | undefined,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch("/api/cosmos/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ messages, currentPlanId }),
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
        const data = JSON.parse(payload) as { content?: string; done?: boolean; error?: string };
        if (data.error) throw new Error(data.error);
        if (data.content) onChunk(data.content);
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }
}

function MessageBubble({ role, content }: { role: ChatRole; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : cn(
                COSMOS_ASSISTANT_GRADIENT_R,
                "text-white rounded-bl-md border border-orange-400/30"
              )
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

export function CosmosChatWidget() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nudgeVisible, setNudgeVisible] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const greetedRef = useRef(false);
  const openRef = useRef(open);
  const pendingNudgeRef = useRef(false);
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
    let cancelled = false;
    fetch("/api/cosmos/status", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((data: { available?: boolean }) => {
        if (!cancelled) setAvailable(Boolean(data.available));
      })
      .catch(() => {
        if (!cancelled) setAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

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
  }, [user]);

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
        content: `¡Hola ${name}! Soy Cosmos, tu asistente cotizador. Puedo ayudarte con información de los planes cargados, precios, itinerarios, inclusiones, hoteles y horarios.\nTambién puedo ayudarte a usar la plataforma. ¿En qué te acompaño hoy?`,
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
      await streamCosmosReply(apiMessages, currentPlanId, (chunk) => {
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
        );
      });
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
  }, [input, loading, available, messages, currentPlanId]);

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 pointer-events-none">
      {open && (
        <div
          className="pointer-events-auto flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl shadow-orange-500/15 animate-in slide-in-from-bottom-4 fade-in duration-200"
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
                Asistente IA · planes y soporte
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
              {available === false && (
                <p className="text-sm text-muted-foreground rounded-lg bg-muted/80 p-3 border">
                  Cosmos no está activo en este servidor. El administrador debe configurar{" "}
                  <code className="text-xs">OPENAI_API_KEY</code> (la misma del importador de planes).
                </p>
              )}
              {messages.map((m) => (
                <MessageBubble key={m.id} role={m.role} content={m.content} />
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
          </div>
        </div>
      )}

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
          "pointer-events-auto h-14 w-14 rounded-full shadow-lg text-white hover:opacity-95 transition-transform",
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
