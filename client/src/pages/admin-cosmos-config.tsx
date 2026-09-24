import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Bot,
  RotateCcw,
  Save,
  Sparkles,
  ScrollText,
  Volume2,
  MessageSquare,
  Library,
} from "lucide-react";
import { CosmosSessionsPanel } from "@/components/cosmos-sessions-panel";
import { CosmosStrategicContextsPanel } from "@/components/cosmos-strategic-contexts";
import {
  COSMOS_TTS_VOICE_OPTIONS,
  DEFAULT_COSMOS_ASSISTANT_CONFIG,
  type CosmosAssistantConfigResponse,
  type CosmosTtsVoice,
} from "@shared/cosmosAssistantConfig";

const FIELD_LIMITS = {
  identity: 2000,
  personality: 4000,
  userGreetingHint: 2000,
  rules: 12000,
} as const;

function FieldCounter({ value, max }: { value: string; max: number }) {
  const len = value.length;
  const warn = len > max * 0.9;
  const over = len > max;
  return (
    <p
      className={cn(
        "text-xs tabular-nums text-right",
        over ? "text-destructive" : warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
      )}
    >
      {len.toLocaleString("es-CO")} / {max.toLocaleString("es-CO")}
    </p>
  );
}

export default function AdminCosmosConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_COSMOS_ASSISTANT_CONFIG);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState("personality");

  const { data, isLoading } = useQuery<CosmosAssistantConfigResponse>({
    queryKey: ["/api/admin/cosmos-config"],
  });

  useEffect(() => {
    if (!data || dirty) return;
    setForm({
      identity: data.identity,
      personality: data.personality,
      userGreetingHint: data.userGreetingHint,
      rules: data.rules,
      strategicContext: data.strategicContext,
      temperature: data.temperature,
      maxTokens: data.maxTokens,
      voice: data.voice ?? DEFAULT_COSMOS_ASSISTANT_CONFIG.voice,
    });
  }, [data, dirty]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("PUT", "/api/admin/cosmos-config", payload);
      return res.json() as Promise<CosmosAssistantConfigResponse>;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(["/api/admin/cosmos-config"], saved);
      setDirty(false);
      toast({
        title: "Configuración guardada",
        description: "Cosmos usará estos ajustes en las próximas conversaciones.",
      });
    },
    onError: (e: Error) => {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = useCallback(() => {
    if (saveMutation.isPending) return;
    saveMutation.mutate(form);
  }, [form, saveMutation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s") return;
      event.preventDefault();
      if (saveMutation.isPending) return;
      saveMutation.mutate(form);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [form, saveMutation]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const updateField = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleRestoreDefaults = () => {
    setForm({ ...DEFAULT_COSMOS_ASSISTANT_CONFIG });
    setDirty(true);
    toast({
      title: "Valores por defecto cargados",
      description: "Guarda los cambios para aplicarlos en producción.",
    });
  };

  const actionButtons = (
    <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
      <Button type="button" variant="outline" size="sm" onClick={handleRestoreDefaults} className="flex-1 sm:flex-none">
        <RotateCcw className="h-4 w-4" />
        Restaurar
      </Button>
      <Button
        type="button"
        size="sm"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="min-w-[9.5rem] flex-[2] sm:flex-none"
      >
        {saveMutation.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm">Cargando configuración de Cosmos…</p>
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl pb-28">
      <Tabs value={tab} onValueChange={setTab} className="space-y-0">
        <div className="sticky top-14 z-20 -mx-4 -mt-4 border-b bg-background/95 px-4 py-3 shadow-sm backdrop-blur-md md:top-20 md:-mx-8 md:-mt-8 md:px-8">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 sm:flex">
                <Bot className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold tracking-tight md:text-xl">Asistente Cosmos</h1>
                  {dirty ? (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                      Sin guardar
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Guardado</Badge>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground sm:text-xs">
                  {data?.updatedAt
                    ? `Actualizado ${new Date(data.updatedAt).toLocaleString("es-CO", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}`
                    : "Sin configuración personalizada"}
                  <span className="ml-2 hidden opacity-70 lg:inline">⌘S para guardar</span>
                </p>
              </div>
            </div>
            {actionButtons}
          </div>

          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-lg p-1 sm:grid-cols-5">
            <TabsTrigger value="personality" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="hidden h-3.5 w-3.5 sm:block" />
              Personalidad
            </TabsTrigger>
            <TabsTrigger value="instructions" className="gap-1.5 text-xs sm:text-sm">
              <ScrollText className="hidden h-3.5 w-3.5 sm:block" />
              Instrucciones
            </TabsTrigger>
            <TabsTrigger value="contexts" className="gap-1.5 text-xs sm:text-sm">
              <Library className="hidden h-3.5 w-3.5 sm:block" />
              Contextos
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-1.5 text-xs sm:text-sm">
              <Volume2 className="hidden h-3.5 w-3.5 sm:block" />
              Voz y modelo
            </TabsTrigger>
            <TabsTrigger value="sessions" className="gap-1.5 text-xs sm:text-sm">
              <MessageSquare className="hidden h-3.5 w-3.5 sm:block" />
              Sesiones
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="space-y-6 pt-6">
          <TabsContent value="personality" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Identidad e instrucciones base</CardTitle>
                <CardDescription>
                  Define quién es Cosmos y cómo debe presentarse. Puedes usar markdown ligero (**negrita**).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cosmos-identity">Identidad del asistente</Label>
                  <Textarea
                    id="cosmos-identity"
                    value={form.identity}
                    onChange={(e) => updateField("identity", e.target.value)}
                    rows={4}
                    className="resize-y"
                  />
                  <FieldCounter value={form.identity} max={FIELD_LIMITS.identity} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cosmos-personality">Personalidad y tono</Label>
                  <Textarea
                    id="cosmos-personality"
                    value={form.personality}
                    onChange={(e) => updateField("personality", e.target.value)}
                    rows={5}
                    className="resize-y"
                  />
                  <FieldCounter value={form.personality} max={FIELD_LIMITS.personality} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cosmos-greeting">Saludo al usuario</Label>
                  <Textarea
                    id="cosmos-greeting"
                    value={form.userGreetingHint}
                    onChange={(e) => updateField("userGreetingHint", e.target.value)}
                    rows={4}
                    className="resize-y"
                  />
                  <p className="text-xs text-muted-foreground">
                    Usa <code className="rounded bg-muted px-1">{"{firstName}"}</code> y{" "}
                    <code className="rounded bg-muted px-1">{"{roleLabel}"}</code> como variables. El sistema
                    antepone automáticamente el nombre y rol del usuario actual.
                  </p>
                  <FieldCounter value={form.userGreetingHint} max={FIELD_LIMITS.userGreetingHint} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructions" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Reglas de comportamiento</CardTitle>
                <CardDescription>
                  Lista numerada de reglas que Cosmos debe seguir en cada respuesta. Usa{" "}
                  <code className="rounded bg-muted px-1">{"{{cardCommissionPercent}}"}</code> para la comisión
                  de tarjeta Davivienda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Textarea
                  value={form.rules}
                  onChange={(e) => updateField("rules", e.target.value)}
                  rows={18}
                  className="min-h-[280px] resize-y font-mono text-sm leading-relaxed"
                />
                <FieldCounter value={form.rules} max={FIELD_LIMITS.rules} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contexts" className="mt-0 space-y-3">
            <div>
              <h2 className="text-base font-semibold">Contextos estratégicos</h2>
              <p className="text-sm text-muted-foreground">
                Cada contexto es un destino o una actividad. Cosmos usa el que coincide con la pregunta o con el plan vinculado.
              </p>
            </div>
            <CosmosStrategicContextsPanel />
          </TabsContent>

          <TabsContent value="voice" className="mt-0 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voz de Cosmos</CardTitle>
                <CardDescription>
                  Elige la voz de OpenAI que usará Cosmos en modo voz. La síntesis está fijada a
                  español latino de Colombia; el cambio de voz aplica en la próxima sesión (no en
                  las que ya estén activas).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2">
                  {COSMOS_TTS_VOICE_OPTIONS.map((option) => {
                    const selected = form.voice === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateField("voice", option.value as CosmosTtsVoice)}
                        aria-pressed={selected}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-colors hover-elevate",
                          selected
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-background"
                        )}
                      >
                        <p className="font-medium leading-none">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Parámetros del modelo</CardTitle>
                <CardDescription>
                  Ajusta creatividad y longitud máxima de las respuestas. Valores más bajos = respuestas más
                  precisas y consistentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="cosmos-temperature">Temperatura</Label>
                    <span className="text-sm font-medium tabular-nums">{form.temperature.toFixed(2)}</span>
                  </div>
                  <Slider
                    id="cosmos-temperature"
                    value={[form.temperature]}
                    min={0}
                    max={1}
                    step={0.05}
                    onValueChange={([value]) => updateField("temperature", Number((value ?? 0).toFixed(2)))}
                  />
                  <p className="text-xs text-muted-foreground">0 = preciso y estable · 1 = más creativo</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor="cosmos-max-tokens">Máximo de tokens</Label>
                    <span className="text-sm font-medium tabular-nums">{form.maxTokens}</span>
                  </div>
                  <Slider
                    id="cosmos-max-tokens"
                    value={[form.maxTokens]}
                    min={200}
                    max={4000}
                    step={100}
                    onValueChange={([value]) => updateField("maxTokens", value ?? 1200)}
                  />
                  <Input
                    type="number"
                    min={200}
                    max={4000}
                    step={100}
                    value={form.maxTokens}
                    onChange={(e) => updateField("maxTokens", Number(e.target.value))}
                    className="max-w-[10rem]"
                    aria-label="Máximo de tokens por respuesta"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sessions" className="mt-0">
            <CosmosSessionsPanel />
          </TabsContent>
        </div>
      </Tabs>

      {dirty ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pr-20 sm:pr-24">
          <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-2 py-2 shadow-lg shadow-primary/10 backdrop-blur-md">
            <span className="hidden pl-3 text-xs font-medium text-amber-700 dark:text-amber-400 sm:inline">
              Cambios sin guardar
            </span>
            <Button type="button" size="sm" onClick={handleSave} disabled={saveMutation.isPending} className="min-w-[9rem] rounded-full">
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveMutation.isPending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
