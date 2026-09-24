import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/rich-text-editor";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountryFlags, countryGroupLabel } from "@/lib/countryFlags";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Destination } from "@shared/schema";
import {
  COSMOS_CONTEXT_CONTENT_MAX,
  COSMOS_CONTEXT_KIND_LABELS,
  type CosmosContextKind,
  type CosmosStrategicContext,
} from "@shared/cosmosStrategicContexts";

const NONE_PLAN = "__none__";

type Draft = {
  name: string;
  kind: CosmosContextKind;
  content: string;
  destinationId: string | null;
  pinned: boolean;
};

function toDraft(ctx: CosmosStrategicContext): Draft {
  return {
    name: ctx.name,
    kind: ctx.kind,
    content: ctx.content,
    destinationId: ctx.destinationId,
    pinned: ctx.pinned,
  };
}

export function CosmosStrategicContextsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  const { data: contexts = [], isLoading } = useQuery<CosmosStrategicContext[]>({
    queryKey: ["/api/admin/cosmos-contexts"],
  });

  const { data: plans = [], isError: plansError, isLoading: plansLoading } = useQuery<Destination[]>({
    queryKey: ["/api/admin/destinations"],
  });

  const sortedPlans = useMemo(
    () => (Array.isArray(plans) ? [...plans] : []).sort((a, b) => a.name.localeCompare(b.name, "es")),
    [plans]
  );

  const plansByCountry = useMemo(() => {
    const groups = new Map<string, Destination[]>();
    for (const plan of sortedPlans) {
      const country = countryGroupLabel(plan.country);
      const list = groups.get(country) ?? [];
      list.push(plan);
      groups.set(country, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      if (a === "Sin país") return 1;
      if (b === "Sin país") return -1;
      return a.localeCompare(b, "es");
    });
  }, [sortedPlans]);

  useEffect(() => {
    if (selectedId && contexts.some((ctx) => ctx.id === selectedId)) return;
    if (!contexts.length) {
      setSelectedId(null);
      setDraft(null);
      return;
    }
    setSelectedId(contexts[0].id);
    setDraft(toDraft(contexts[0]));
  }, [contexts, selectedId]);

  const selected = contexts.find((ctx) => ctx.id === selectedId) ?? null;
  const dirty =
    selected != null &&
    draft != null &&
    (draft.name !== selected.name ||
      draft.kind !== selected.kind ||
      draft.content !== selected.content ||
      draft.destinationId !== selected.destinationId ||
      draft.pinned !== selected.pinned);

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/cosmos-contexts", {
        name: "Nuevo contexto",
        kind: "destination",
        content: "",
        destinationId: null,
        pinned: false,
      });
      return res.json() as Promise<CosmosStrategicContext>;
    },
    onSuccess: (created) => {
      queryClient.setQueryData<CosmosStrategicContext[]>(["/api/admin/cosmos-contexts"], (prev) => {
        const list = prev ?? [];
        return list.some((ctx) => ctx.id === created.id) ? list : [created, ...list];
      });
      setSelectedId(created.id);
      setDraft(toDraft(created));
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/cosmos-config"] });
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo crear el contexto", description: e.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !draft) throw new Error("No hay contexto seleccionado");
      const res = await apiRequest("PUT", `/api/admin/cosmos-contexts/${selected.id}`, {
        name: draft.name.trim(),
        kind: draft.kind,
        content: draft.content,
        destinationId: draft.destinationId,
        pinned: draft.pinned,
      });
      return res.json() as Promise<CosmosStrategicContext>;
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<CosmosStrategicContext[]>(["/api/admin/cosmos-contexts"], (prev) =>
        (prev ?? []).map((ctx) => (ctx.id === saved.id ? saved : ctx))
      );
      setDraft(toDraft(saved));
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/cosmos-config"] });
      toast({ title: "Contexto guardado", description: "Cosmos lo usará en las próximas consultas que coincidan." });
    },
    onError: (e: Error) => {
      toast({ title: "Error al guardar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/cosmos-contexts/${id}`);
    },
    onSuccess: (_data, id) => {
      queryClient.setQueryData<CosmosStrategicContext[]>(["/api/admin/cosmos-contexts"], (prev) =>
        (prev ?? []).filter((ctx) => ctx.id !== id)
      );
      setSelectedId(null);
      setDraft(null);
      void queryClient.invalidateQueries({ queryKey: ["/api/admin/cosmos-config"] });
      toast({ title: "Contexto eliminado" });
    },
    onError: (e: Error) => {
      toast({ title: "No se pudo eliminar", description: e.message, variant: "destructive" });
    },
  });

  const selectContext = (id: string) => {
    if (dirty && !window.confirm("Hay cambios sin guardar en este contexto. ¿Descartarlos?")) return;
    const next = contexts.find((ctx) => ctx.id === id);
    setSelectedId(id);
    if (next) setDraft(toDraft(next));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Cargando contextos…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="grid min-h-[32rem] grid-cols-1 md:grid-cols-[16rem_1fr]">
        <aside className="flex flex-col border-b bg-muted/30 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-3">
            <p className="text-sm font-medium">Contextos</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Nuevo
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {contexts.length === 0 ? (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Aún no hay contextos. Crea uno para un destino o una actividad.
              </p>
            ) : (
              <ul className="space-y-1">
                {contexts.map((ctx) => {
                  const active = ctx.id === selectedId;
                  const plan = sortedPlans.find((p) => p.id === ctx.destinationId);
                  return (
                    <li key={ctx.id}>
                      <button
                        type="button"
                        onClick={() => selectContext(ctx.id)}
                        className={cn(
                          "w-full rounded-lg px-3 py-2 text-left transition-colors",
                          active ? "bg-background shadow-sm ring-1 ring-border" : "hover:bg-background/70"
                        )}
                      >
                        <p className="truncate text-sm font-medium">{ctx.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {COSMOS_CONTEXT_KIND_LABELS[ctx.kind]}
                          {plan ? ` · ${plan.name}` : ""}
                          {ctx.pinned ? " · siempre" : ""}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-col">
          {!draft || !selected ? (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              Selecciona o crea un contexto para escribir su información.
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Label htmlFor="context-name">Nombre</Label>
                  <Input
                    id="context-name"
                    value={draft.name}
                    maxLength={120}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar el contexto «${selected.name}»?`)) return;
                    deleteMutation.mutate(selected.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={draft.kind}
                    onValueChange={(value) => setDraft({ ...draft, kind: value as CosmosContextKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="destination">Destino</SelectItem>
                      <SelectItem value="activity">Actividad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Plan vinculado</Label>
                  <Select
                    value={draft.destinationId ?? NONE_PLAN}
                    onValueChange={(value) =>
                      setDraft({ ...draft, destinationId: value === NONE_PLAN ? null : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin vínculo" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value={NONE_PLAN}>Sin vínculo</SelectItem>
                      {plansByCountry.map(([country, countryPlans]) => (
                        <SelectGroup key={country}>
                          <SelectLabel className="mt-1 flex items-center justify-center gap-2 rounded-md bg-muted px-2 py-2 text-center text-xs font-semibold uppercase tracking-wide text-foreground">
                            {country !== "Sin país" ? <CountryFlags country={country} /> : null}
                            {country}
                          </SelectLabel>
                          {countryPlans.map((plan) => (
                            <SelectItem key={plan.id} value={plan.id}>
                              {plan.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {plansLoading
                      ? "Cargando planes…"
                      : plansError
                        ? "No se pudieron cargar los planes."
                        : "Opcional. Cosmos lo prioriza cuando hablen de ese plan."}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Usar en todas las consultas</p>
                  <p className="text-xs text-muted-foreground">
                    Si está apagado, Cosmos solo lo usa cuando el nombre o el plan coinciden con la pregunta.
                  </p>
                </div>
                <Switch
                  checked={draft.pinned}
                  onCheckedChange={(checked) => setDraft({ ...draft, pinned: checked })}
                  aria-label="Usar en todas las consultas"
                />
              </div>

              <div className="space-y-2">
                <Label>Información del contexto</Label>
                <RichTextEditor
                  value={draft.content}
                  onChange={(content) => setDraft({ ...draft, content })}
                  placeholder="Describe con detalle lo que Cosmos debe saber de este destino o actividad…"
                  minHeight={280}
                />
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {draft.content.length.toLocaleString("es-CO")} / {COSMOS_CONTEXT_CONTENT_MAX.toLocaleString("es-CO")}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => saveMutation.mutate()}
                  disabled={!dirty || saveMutation.isPending || !draft.name.trim()}
                >
                  {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Guardar contexto
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
