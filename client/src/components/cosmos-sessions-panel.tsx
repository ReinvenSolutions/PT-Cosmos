import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

type SessionStats = {
  total: number;
  last24h: number;
  text: number;
  voice: number;
  sip: number;
};

type SessionRow = {
  id: string;
  userId: string;
  channel: string;
  roomName: string | null;
  startedAt: string;
  endedAt: string | null;
  userName: string | null;
  username: string;
  messageCount: number;
};

type SessionMessage = {
  id: string;
  role: string;
  content: string;
  toolName: string | null;
  createdAt: string;
};

function channelLabel(channel: string): string {
  if (channel === "voice") return "Voz";
  if (channel === "sip") return "Teléfono";
  return "Texto";
}

export function CosmosSessionsPanel() {
  const [openId, setOpenId] = useState<string | null>(null);
  const statsQuery = useQuery<SessionStats>({
    queryKey: ["/api/admin/cosmos-sessions/stats"],
  });
  const listQuery = useQuery<{ sessions: SessionRow[] }>({
    queryKey: ["/api/admin/cosmos-sessions"],
  });
  const messagesQuery = useQuery<{ messages: SessionMessage[] }>({
    queryKey: ["/api/admin/cosmos-sessions", openId],
    enabled: Boolean(openId),
    queryFn: async () => {
      const res = await fetch(`/api/admin/cosmos-sessions/${openId}`, { credentials: "include" });
      if (!res.ok) throw new Error("No se pudieron cargar los mensajes");
      return res.json();
    },
  });

  const stats = statsQuery.data;
  const sessions = listQuery.data?.sessions ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Observabilidad de sesiones</CardTitle>
        <CardDescription>
          Transcripciones y métricas de Cosmos en texto, voz web y (cuando exista) teléfono.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Total" value={stats.total} />
            <Stat label="Últimas 24 h" value={stats.last24h} />
            <Stat label="Texto" value={stats.text} />
            <Stat label="Voz" value={stats.voice} />
            <Stat label="SIP" value={stats.sip} />
          </div>
        )}
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando sesiones…
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay sesiones registradas.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {sessions.map((s) => (
              <li key={s.id} className="p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {s.userName || s.username}
                      <span className="text-muted-foreground font-normal"> · {s.messageCount} msgs</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startedAt).toLocaleString("es-CO")}
                      {s.endedAt ? "" : " · activa"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{channelLabel(s.channel)}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setOpenId((id) => (id === s.id ? null : s.id))}
                    >
                      {openId === s.id ? "Ocultar" : "Ver"}
                    </Button>
                  </div>
                </div>
                {openId === s.id && (
                  <div className="rounded-md bg-muted/50 p-3 space-y-2 max-h-72 overflow-y-auto">
                    {messagesQuery.isLoading ? (
                      <p className="text-xs text-muted-foreground">Cargando transcripción…</p>
                    ) : (
                      (messagesQuery.data?.messages ?? []).map((m) => (
                        <p key={m.id} className="text-xs leading-relaxed">
                          <span className="font-semibold">
                            {m.role === "assistant" ? "Cosmos" : m.role === "tool" ? `Tool ${m.toolName ?? ""}` : "Usuario"}
                            :{" "}
                          </span>
                          {m.content}
                        </p>
                      ))
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
