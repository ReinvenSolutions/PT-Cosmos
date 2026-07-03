import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Loader2, Bot, RotateCcw, Save } from "lucide-react";
import {
  DEFAULT_COSMOS_ASSISTANT_CONFIG,
  type CosmosAssistantConfigResponse,
} from "@shared/cosmosAssistantConfig";

export default function AdminCosmosConfig() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_COSMOS_ASSISTANT_CONFIG);
  const [dirty, setDirty] = useState(false);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-sm">Cargando configuración de Cosmos…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Asistente Cosmos</h1>
              <p className="text-sm text-muted-foreground">
                Configura instrucciones, tono, reglas y contexto estratégico del asistente virtual.
              </p>
            </div>
          </div>
          {data?.updatedAt ? (
            <p className="text-xs text-muted-foreground">
              Última actualización:{" "}
              {new Date(data.updatedAt).toLocaleString("es-CO", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Aún no hay configuración personalizada guardada.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleRestoreDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Restaurar defaults
          </Button>
          <Button
            type="button"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar cambios
          </Button>
        </div>
      </div>

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
              rows={3}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cosmos-personality">Personalidad y tono</Label>
            <Textarea
              id="cosmos-personality"
              value={form.personality}
              onChange={(e) => updateField("personality", e.target.value)}
              rows={4}
              className="resize-y"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cosmos-greeting">Saludo al usuario</Label>
            <Textarea
              id="cosmos-greeting"
              value={form.userGreetingHint}
              onChange={(e) => updateField("userGreetingHint", e.target.value)}
              rows={3}
              className="resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Usa <code className="rounded bg-muted px-1">{"{firstName}"}</code> y{" "}
              <code className="rounded bg-muted px-1">{"{roleLabel}"}</code> como variables. El sistema
              antepone automáticamente el nombre y rol del usuario actual.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de comportamiento</CardTitle>
          <CardDescription>
            Lista numerada de reglas que Cosmos debe seguir en cada respuesta. Usa{" "}
            <code className="rounded bg-muted px-1">{"{{cardCommissionPercent}}"}</code> para la comisión
            de tarjeta Davivienda.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            value={form.rules}
            onChange={(e) => updateField("rules", e.target.value)}
            rows={18}
            className="resize-y font-mono text-sm leading-relaxed"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contexto estratégico</CardTitle>
          <CardDescription>
            Información adicional para alimentar a Cosmos: políticas comerciales, prioridades de venta,
            campañas, lineamientos del equipo u otros datos que no están en los planes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RichTextEditor
            value={form.strategicContext}
            onChange={(value) => updateField("strategicContext", value)}
            placeholder="Escribe aquí el contexto estratégico para el asistente…"
            minHeight={280}
          />
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
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cosmos-temperature">Temperatura (0 – 1)</Label>
            <Input
              id="cosmos-temperature"
              type="number"
              min={0}
              max={1}
              step={0.05}
              value={form.temperature}
              onChange={(e) => updateField("temperature", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cosmos-max-tokens">Máximo de tokens por respuesta</Label>
            <Input
              id="cosmos-max-tokens"
              type="number"
              min={200}
              max={4000}
              step={100}
              value={form.maxTokens}
              onChange={(e) => updateField("maxTokens", Number(e.target.value))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
