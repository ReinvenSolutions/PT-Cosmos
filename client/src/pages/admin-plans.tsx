import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MapPin, Plus, Pencil, Trash2, Search, GripVertical, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { useState, useCallback } from "react";
import { prefetchRoute } from "@/lib/route-prefetch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient, invalidatePublicDestinationQueries } from "@/lib/queryClient";
import { formatUSD } from "@shared/schema";
import { getDestinationImage } from "@/lib/destination-images";
import { OptimizedImage } from "@/components/optimized-image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { CountryFlags } from "@/lib/countryFlags";

const CONFIRM_WORDS = [
  "ELIMINAR", "BORRAR", "CONFIRMAR", "PERMANENTE", "ADIOS", "DESTRUIR",
  "FINAL", "TERMINAR", "SUPRIMIR", "CANCELAR", "QUITAR", "QUEMAR",
  "TURBINA", "MARIPOSA", "DINAMO", "PIZARRA", "VOLCAN", "RASCACIELOS"
];

function generateRandomWord(): string {
  return CONFIRM_WORDS[Math.floor(Math.random() * CONFIRM_WORDS.length)];
}

interface Destination {
  id: string;
  name: string;
  country: string;
  duration: number;
  nights: number;
  basePrice: string | null;
  isActive: boolean;
  displayOrder: number;
  imageUrl: string | null;
  agencyDisplayName?: string | null;
  createdByUserId?: string | null;
}

function SortableRow({
  dest,
  onEdit,
  onDelete,
  onToggleActive,
  isSortable,
  isToggling,
  canDelete,
  showAgencyColumn,
}: {
  dest: Destination;
  onEdit: (id: string) => void;
  onDelete: (dest: Destination) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  isSortable: boolean;
  isToggling: boolean;
  canDelete: boolean;
  showAgencyColumn: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: dest.id, disabled: !isSortable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const img = getDestinationImage(dest) || dest.imageUrl || "";

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "bg-muted/50 opacity-80 shadow-md z-10",
        !isSortable && "opacity-100"
      )}
    >
      <TableCell className="w-10">
        {isSortable ? (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1.5 rounded hover:bg-muted touch-none"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        ) : (
          <div className="w-10 h-8 flex items-center justify-center text-muted-foreground/40">
            <GripVertical className="h-4 w-4" />
          </div>
        )}
      </TableCell>
      <TableCell>
        {img ? (
          <OptimizedImage
            src={img}
            alt={dest.name}
            preset="thumb"
            containerClassName="h-12 w-12 rounded overflow-hidden"
            imageClassName="object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium leading-tight">{dest.name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CountryFlags country={dest.country} />
          <span>{dest.country}</span>
        </div>
      </TableCell>
      {showAgencyColumn && (
        <TableCell>
          {dest.agencyDisplayName ? (
            <Badge variant="secondary" className="text-xs font-medium bg-violet-500/15 text-violet-800 dark:text-violet-200 border-violet-500/30">
              {dest.agencyDisplayName}
            </Badge>
          ) : (
            <span className="text-muted-foreground text-sm">Cosmos</span>
          )}
        </TableCell>
      )}
      <TableCell className="text-muted-foreground">{dest.duration} días · {dest.nights} noches</TableCell>
      <TableCell>
        {dest.basePrice ? formatUSD(dest.basePrice) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          {isToggling ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-label="Guardando..." />
          ) : (
            <Switch
              checked={dest.isActive}
              onCheckedChange={(checked) => onToggleActive(dest.id, checked)}
              aria-label={dest.isActive ? "Ocultar del catálogo" : "Mostrar en el catálogo"}
            />
          )}
          <Badge variant={dest.isActive ? "default" : "secondary"} className="hidden sm:inline-flex">
            {dest.isActive ? "Visible" : "Oculto"}
          </Badge>
        </div>
      </TableCell>
      <TableCell className="text-right space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(dest.id)}
          onMouseEnter={() => prefetchRoute(`/admin/plans/${dest.id}/edit`)}
        >
          <Pencil className="h-4 w-4 mr-1" />
          Editar
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(dest)}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Eliminar
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function AdminPlans() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isProvider = user?.role === "provider";
  const isSuperAdmin = user?.role === "super_admin";
  const canDeletePlans = isSuperAdmin;
  const showAgencyColumn = isSuperAdmin;
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden">("all");
  const [deleteTarget, setDeleteTarget] = useState<Destination | null>(null);
  const [confirmWord, setConfirmWord] = useState("");
  const [randomWord, setRandomWord] = useState("");

  const { data: destinations = [], isLoading, isError, error } = useQuery<Destination[]>({
    queryKey: ["/api/admin/destinations"],
  });

  const query = search.trim().toLowerCase();
  const activeCount = destinations.filter((d) => d.isActive).length;
  const hiddenCount = destinations.length - activeCount;
  const filteredPlans = destinations.filter((d) => {
    const matchesQuery = !query || d.name.toLowerCase().includes(query) || d.country.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter === "all" || (statusFilter === "active" ? d.isActive : !d.isActive);
    return matchesQuery && matchesStatus;
  });

  const canReorder = query === "" && statusFilter === "all";
  const sortablePlans = canReorder ? filteredPlans : filteredPlans;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/destinations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations"] });
      invalidatePublicDestinationQueries(queryClient);
      toast({ title: "Plan eliminado", description: "El plan ha sido eliminado correctamente." });
      setDeleteTarget(null);
      setConfirmWord("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar",
        description: error.message || "No se pudo eliminar el plan.",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiRequest("PATCH", `/api/admin/destinations/${id}`, { isActive });
    },
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/destinations"] });
      const previous = queryClient.getQueryData<Destination[]>(["/api/admin/destinations"]);
      queryClient.setQueryData(
        ["/api/admin/destinations"],
        (previous ?? []).map((d) => (d.id === id ? { ...d, isActive } : d))
      );
      return { previous };
    },
    onError: (error: Error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/admin/destinations"], context.previous);
      }
      toast({
        title: "Error al actualizar",
        description: error.message || "No se pudo actualizar el estado.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/destinations"] });
      invalidatePublicDestinationQueries(queryClient);
    },
    onSuccess: () => {
      toast({ title: "Estado actualizado", description: "El plan se ha activado o desactivado correctamente." });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (items: { id: string; displayOrder: number }[]): Promise<Destination[]> => {
      const res = await apiRequest("PATCH", "/api/admin/destinations/reorder", { items });
      const data = await res.json().catch(() => {
        throw new Error("El servidor devolvió una respuesta inválida. Verifica que el backend esté corriendo y usa npm run dev.");
      });
      return data;
    },
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: ["/api/admin/destinations"] });
      const previous = queryClient.getQueryData<Destination[]>(["/api/admin/destinations"]);
      const orderMap = new Map(items.map((i) => [i.id, i.displayOrder]));
      const reordered = [...(previous ?? [])].sort(
        (a, b) => (orderMap.get(a.id) ?? 999) - (orderMap.get(b.id) ?? 999)
      );
      queryClient.setQueryData(
        ["/api/admin/destinations"],
        reordered.map((d) => ({ ...d, displayOrder: orderMap.get(d.id) ?? d.displayOrder }))
      );
      return { previous };
    },
    onError: (err, _items, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["/api/admin/destinations"], context.previous);
      }
      const msg = err instanceof Error ? err.message : "No se pudo guardar el nuevo orden.";
      toast({
        title: "Error al reordenar",
        description: msg,
        variant: "destructive",
      });
    },
    onSuccess: async (updatedDestinations) => {
      queryClient.setQueryData(["/api/admin/destinations"], updatedDestinations);
      const activeOnly = updatedDestinations.filter((d) => d.isActive);
      queryClient.setQueryData(["/api/destinations?isActive=true"], activeOnly);
      queryClient.setQueryData(["/api/destinations?isActive=false"], updatedDestinations.filter((d) => !d.isActive));
      await queryClient.refetchQueries({ queryKey: ["/api/admin/destinations"], type: "active" });
      await queryClient.refetchQueries({ queryKey: ["/api/destinations"], type: "active" });
      invalidatePublicDestinationQueries(queryClient);
      toast({ title: "Orden actualizado", description: "El orden de los planes se ha guardado correctamente." });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || !canReorder) return;

      const oldIndex = sortablePlans.findIndex((d) => d.id === active.id);
      const newIndex = sortablePlans.findIndex((d) => d.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(sortablePlans, oldIndex, newIndex);
      const items = reordered.map((d, i) => ({ id: d.id, displayOrder: i }));
      reorderMutation.mutate(items);
    },
    [sortablePlans, canReorder, reorderMutation]
  );

  const handleOpenDelete = (dest: Destination) => {
    setDeleteTarget(dest);
    setConfirmWord("");
    setRandomWord(generateRandomWord());
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || confirmWord !== randomWord) return;
    deleteMutation.mutate(deleteTarget.id);
  };

  const canDelete = confirmWord === randomWord && randomWord.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isProvider ? "Mis planes" : "Planes"}
          </h1>
          <p className="mt-1 max-w-xl text-muted-foreground">
            {isProvider
              ? "Crea y edita tus planes. Solo tú puedes modificar los que hayas creado."
              : "Publica, ordena y actualiza los viajes del catálogo."}
          </p>
        </div>
        <Button onClick={() => setLocation("/admin/plans/new")} onMouseEnter={() => prefetchRoute("/admin/plans/new")}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo plan
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { id: "all" as const, label: "Todos", value: destinations.length },
            { id: "active" as const, label: "Visibles", value: activeCount },
            { id: "hidden" as const, label: "Ocultos", value: hiddenCount },
          ]
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setStatusFilter(item.id)}
            className={cn(
              "rounded-xl border px-3 py-3 text-left transition-colors",
              statusFilter === item.id
                ? "border-primary bg-primary/10 shadow-sm"
                : "border-border bg-card hover:bg-muted/50"
            )}
          >
            <div className="text-2xl font-semibold tabular-nums">{item.value}</div>
            <div className="text-xs text-muted-foreground">{item.label}</div>
          </button>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle>Catálogo</CardTitle>
              <CardDescription>
                {filteredPlans.length} de {destinations.length} plan{destinations.length === 1 ? "" : "es"}.
                Solo los visibles aparecen en el catálogo.
                {!canReorder && (
                  <span className="mt-1 block text-amber-600 dark:text-amber-500">
                    Quita la búsqueda y el filtro para reordenar arrastrando.
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar por nombre o país..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isError && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <span className="block font-medium">No se pudo cargar el listado de planes.</span>
                <span className="block text-sm opacity-95">{(error as Error)?.message || "Error desconocido"}</span>
                <span className="block text-sm opacity-90">
                  Si ves 401 o «No autenticado», inicia sesión como super admin. Si menciona una columna SQL faltante,
                  aplica <code className="rounded bg-background/80 px-1">npm run db:apply-pending</code> (incluye{" "}
                  <code className="rounded bg-background/80 px-1">0014</code>,{" "}
                  <code className="rounded bg-background/80 px-1">0015</code>, etc.) o las migraciones SQL a mano.
                </span>
              </AlertDescription>
            </Alert>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead className="w-[80px]">Imagen</TableHead>
                  <TableHead>Plan</TableHead>
                  {showAgencyColumn && <TableHead>Proveedor</TableHead>}
                  <TableHead>Duración</TableHead>
                  <TableHead>Precio base</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-12 w-12 rounded" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                      </TableRow>
                    ))}
                  </>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={showAgencyColumn ? 8 : 7} className="text-center py-6 text-muted-foreground">
                      Corrige el error indicado arriba y recarga la página.
                    </TableCell>
                  </TableRow>
                ) : filteredPlans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={showAgencyColumn ? 8 : 7} className="py-12 text-center">
                      <p className="font-medium">No hay planes con ese criterio</p>
                      <p className="mt-1 text-sm text-muted-foreground">Prueba con otro nombre, país o filtro.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  <SortableContext
                    items={sortablePlans.map((d) => d.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {filteredPlans.map((dest) => (
                      <SortableRow
                        key={dest.id}
                        dest={dest}
                        onEdit={(id) => setLocation(`/admin/plans/${id}/edit`)}
                        onDelete={handleOpenDelete}
                        onToggleActive={(id, isActive) => toggleActiveMutation.mutate({ id, isActive })}
                        isSortable={canReorder}
                        isToggling={!!(toggleActiveMutation.isPending && toggleActiveMutation.variables && toggleActiveMutation.variables.id === dest.id)}
                        canDelete={canDeletePlans}
                        showAgencyColumn={showAgencyColumn}
                      />
                    ))}
                  </SortableContext>
                )}
              </TableBody>
            </Table>
            </div>
          </DndContext>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar plan permanentemente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Para confirmar, escribe la palabra{" "}
              <strong className="font-mono text-destructive bg-destructive/10 px-2 py-0.5 rounded">
                {randomWord}
              </strong>{" "}
              en el recuadro.
            </AlertDialogDescription>
            {deleteTarget && (
              <p className="text-sm text-muted-foreground">
                Plan a eliminar: <strong>{deleteTarget.name}</strong>
              </p>
            )}
            <Input
              placeholder={`Escribe "${randomWord}" para confirmar`}
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value.toUpperCase())}
              className="font-mono mt-2"
              autoComplete="off"
            />
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmDelete();
              }}
              disabled={!canDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
