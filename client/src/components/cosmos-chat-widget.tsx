import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Loader2, MessageCircle, Send, Sparkles, X, Minimize2 } from "lucide-react";

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
            : "bg-muted text-foreground rounded-bl-md border border-border/60"
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const greetedRef = useRef(false);

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading || !available) return;

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
          className="pointer-events-auto flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border/80 bg-background shadow-2xl shadow-primary/10 animate-in slide-in-from-bottom-4 fade-in duration-200"
          role="dialog"
          aria-label="Chat con Cosmos"
        >
          <header className="flex items-center gap-3 border-b bg-gradient-to-r from-primary to-[hsl(191,46%,48%)] px-4 py-3 text-primary-foreground">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 ring-2 ring-white/30">
              <Sparkles className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm leading-tight">Cosmos</p>
              <p className="text-[11px] text-primary-foreground/85 truncate">
                Asistente IA · planes y soporte
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-primary-foreground hover:bg-white/20"
              onClick={() => setOpen(false)}
              aria-label="Minimizar chat"
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          </header>

          <ScrollArea className="h-[min(52vh,420px)]">
            <div ref={scrollRef} className="space-y-3 p-4">
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
          </ScrollArea>

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
                className="shrink-0 h-10 w-10 rounded-xl"
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

      <Button
        type="button"
        size="lg"
        className={cn(
          "pointer-events-auto h-14 w-14 rounded-full shadow-lg shadow-primary/30 bg-gradient-to-br from-primary to-[hsl(191,46%,50%)] hover:opacity-95 transition-transform",
          open && "scale-95"
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Cerrar chat Cosmos" : "Abrir chat Cosmos"}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  );
}
