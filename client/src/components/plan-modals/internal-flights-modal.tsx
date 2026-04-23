import { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Finder/macOS a veces deja `type` vacío; HEIC y otros siguen siendo imágenes por extensión. */
function isImageFile(f: File): boolean {
  if (f.type.startsWith("image/")) return true;
  const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
  return ["png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp", "tif", "tiff"].includes(ext);
}

/** Incluye items[kind=file] porque en Safari/macOS `types` a veces va vacío hasta el drop. */
function dataTransferHasFiles(dt: DataTransfer | null): boolean {
  if (!dt) return false;
  const types = Array.from(dt.types ?? []);
  if (types.includes("Files")) return true;
  if (types.includes("application/x-moz-file")) return true;
  if (dt.items?.length) {
    return Array.from(dt.items).some((it) => it.kind === "file");
  }
  return false;
}

export type InternalFlightItem = {
  imageUrl: string;
  label?: string;
  cabinBaggage?: boolean;
  holdBaggage?: boolean;
  /** Ida → cotización «Vuelos de ida»; regreso → «Vuelos de regreso»; domestic → interno/conexión. */
  flightRole?: "outbound" | "return" | "domestic";
};

interface InternalFlightsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  internalFlights: InternalFlightItem[];
  onSave: (flights: InternalFlightItem[]) => void;
  planName: string;
}

function SortableFlightCard({
  item,
  index,
  onUpdate,
  onRemove,
  onUploadForIndex,
  onAppendAfterUpload,
  planName,
  uploading,
}: {
  item: InternalFlightItem;
  index: number;
  onUpdate: (f: Partial<InternalFlightItem>) => void;
  onRemove: () => void;
  onUploadForIndex: (index: number, url: string) => void;
  /** Si en una ranura vacía sueltas varias imágenes, la primera llena la ranura y el resto se agregan al final. */
  onAppendAfterUpload: (urls: string[]) => void;
  planName: string;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [slotDragOver, setSlotDragOver] = useState(false);
  const { toast } = useToast();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.imageUrl || `empty-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col rounded-lg border overflow-hidden bg-muted/20",
        isDragging && "opacity-90 shadow-lg z-50 ring-2 ring-primary"
      )}
    >
      <div className="flex gap-3 p-3">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-background border shrink-0 self-center"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative aspect-[4/3] flex flex-col items-center justify-center bg-muted/30 rounded-lg overflow-hidden shrink-0">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.label || `Vuelo ${index + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={async (e) => {
                    const list = e.target.files ? Array.from(e.target.files).filter(isImageFile) : [];
                    if (!list.length || !planName.trim()) return;
                    try {
                      for (let i = 0; i < list.length; i++) {
                        const formData = new FormData();
                        formData.append("file", list[i]);
                        formData.append("planName", planName.trim());
                        formData.append("galleryIndex", String(index + i + 1));
                        const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                        if (!res.ok) throw new Error("Upload failed");
                        const { url } = await res.json();
                        if (i === 0) onUploadForIndex(index, url);
                        else onAppendAfterUpload([url]);
                      }
                    } catch {
                      toast({
                        title: "Error",
                        description: "No se pudo subir la imagen.",
                        variant: "destructive",
                      });
                    }
                    e.target.value = "";
                  }}
                />
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!uploading) fileRef.current?.click();
                    }
                  }}
                  className={cn(
                    "absolute inset-0 m-1 rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 px-2 text-center transition-colors cursor-pointer select-none",
                    "border-muted-foreground/35 hover:border-primary/50 hover:bg-muted/40",
                    slotDragOver && "border-primary bg-primary/10",
                    uploading && "opacity-70 cursor-wait",
                    !planName.trim() && "ring-1 ring-amber-500/50"
                  )}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    if (dataTransferHasFiles(e.dataTransfer)) {
                      e.dataTransfer.dropEffect = "copy";
                    }
                    if (!uploading) setSlotDragOver(true);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dataTransferHasFiles(e.dataTransfer)) {
                      e.dataTransfer.dropEffect = "copy";
                    }
                    if (!uploading) setSlotDragOver(true);
                  }}
                  onDragLeave={(e) => {
                    const next = e.relatedTarget as Node | null;
                    if (e.currentTarget.contains(next)) return;
                    setSlotDragOver(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setSlotDragOver(false);
                    if (uploading) return;
                    if (!planName.trim()) {
                      toast({
                        title: "Nombre requerido",
                        description: "Escribe el nombre del plan en el formulario antes de subir imágenes.",
                        variant: "destructive",
                      });
                      return;
                    }
                    const dropped = Array.from(e.dataTransfer.files || []).filter(isImageFile);
                    if (!dropped.length) return;
                    void (async () => {
                      try {
                        for (let i = 0; i < dropped.length; i++) {
                          const formData = new FormData();
                          formData.append("file", dropped[i]);
                          formData.append("planName", planName.trim());
                          formData.append("galleryIndex", String(index + i + 1));
                          const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                          if (!res.ok) throw new Error("Upload failed");
                          const { url } = await res.json();
                          if (i === 0) onUploadForIndex(index, url);
                          else onAppendAfterUpload([url]);
                        }
                      } catch {
                        toast({
                          title: "Error",
                          description: "No se pudo subir la imagen.",
                          variant: "destructive",
                        });
                      }
                    })();
                  }}
                  onClick={() => !uploading && fileRef.current?.click()}
                >
                  <Upload className="h-6 w-6 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground leading-tight">
                    Arrastra o haz clic
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    PNG, JPG, WebP
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <Label className="text-xs">Tipo de tramo</Label>
              <Select
                value={item.flightRole ?? "outbound"}
                onValueChange={(v) =>
                  onUpdate({ flightRole: v as InternalFlightItem["flightRole"] })
                }
              >
                <SelectTrigger className="h-8 text-sm mt-0.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outbound">Vuelo de ida</SelectItem>
                  <SelectItem value="return">Vuelo de regreso</SelectItem>
                  <SelectItem value="domestic">Conexión / vuelo interno</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Etiqueta (opcional)</Label>
              <Input
                value={item.label ?? ""}
                onChange={(e) => onUpdate({ label: e.target.value || undefined })}
                placeholder="Ej: Lima - Cusco"
                className="h-8 text-sm"
              />
            </div>
            <div className="flex gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={item.cabinBaggage ?? false}
                  onCheckedChange={(c) => onUpdate({ cabinBaggage: !!c })}
                />
                <span className="text-xs">Cabina</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={item.holdBaggage ?? false}
                  onCheckedChange={(c) => onUpdate({ holdBaggage: !!c })}
                />
                <span className="text-xs">Bodega</span>
              </label>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function InternalFlightsModal({
  open,
  onOpenChange,
  internalFlights,
  onSave,
  planName,
}: InternalFlightsModalProps) {
  const [flights, setFlights] = useState<InternalFlightItem[]>(internalFlights);
  const [uploading, setUploading] = useState(false);
  const [bulkDragOver, setBulkDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkDragCapCleanup = useRef<(() => void) | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    setFlights(internalFlights);
  }, [internalFlights, open]);

  /**
   * Sin preventDefault en dragover a nivel ventana, Chrome/Safari suelen mostrar prohibido y no disparan drop.
   * Solo cuando el modal está abierto.
   */
  useEffect(() => {
    if (!open) return;
    const onWindowDragOver = (e: DragEvent) => {
      const dt = e.dataTransfer;
      if (!dataTransferHasFiles(dt)) return;
      e.preventDefault();
      if (dt) dt.dropEffect = "copy";
    };
    window.addEventListener("dragover", onWindowDragOver);
    return () => window.removeEventListener("dragover", onWindowDragOver);
  }, [open]);

  const setBulkDropNode = useCallback((node: HTMLDivElement | null) => {
    bulkDragCapCleanup.current?.();
    bulkDragCapCleanup.current = null;
    if (!node) return;
    const onDragOverCap = (e: DragEvent) => {
      if (!dataTransferHasFiles(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    node.addEventListener("dragover", onDragOverCap, true);
    bulkDragCapCleanup.current = () => node.removeEventListener("dragover", onDragOverCap, true);
  }, []);

  useEffect(() => {
    return () => {
      bulkDragCapCleanup.current?.();
      bulkDragCapCleanup.current = null;
    };
  }, []);

  /* MouseSensor (no PointerSensor): evita que dnd-kit compita con el drag nativo de archivos del SO. */
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFlights(internalFlights);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(flights);
    onOpenChange(false);
    toast({ title: "Vuelos internos guardados", description: "Los cambios se aplicarán al guardar el plan." });
  };

  const updateFlight = (index: number, f: Partial<InternalFlightItem>) => {
    setFlights((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...f } : item))
    );
  };

  const removeFlight = (index: number) => {
    setFlights((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFlights((prev) => {
        const oldIndex = prev.findIndex((f, i) => (f.imageUrl || `empty-${i}`) === active.id);
        const newIndex = prev.findIndex((f, i) => (f.imageUrl || `empty-${i}`) === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const appendUrlsAsFlights = (urls: string[]) => {
    if (!urls.length) return;
    setFlights((prev) => [
      ...prev,
      ...urls.map((imageUrl) => ({
        imageUrl,
        cabinBaggage: false,
        holdBaggage: false,
        flightRole: "outbound" as const,
      })),
    ]);
  };

  const processAppendNewFlights = async (rawFiles: File[]) => {
    if (!planName.trim()) {
      toast({
        title: "Nombre requerido",
        description: "Ingresa el nombre del plan antes de subir imágenes.",
        variant: "destructive",
      });
      return;
    }
    const imageFiles = rawFiles.filter(isImageFile);
    if (!imageFiles.length) return;
    setUploading(true);
    try {
      for (let i = 0; i < imageFiles.length; i++) {
        const formData = new FormData();
        formData.append("file", imageFiles[i]);
        formData.append("planName", planName.trim());
        formData.append("galleryIndex", String(flights.length + i + 1));
        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        if (!res.ok) throw new Error("Upload failed");
        const { url } = await res.json();
        setFlights((prev) => [
          ...prev,
          { imageUrl: url, cabinBaggage: false, holdBaggage: false, flightRole: "outbound" },
        ]);
      }
      toast({ title: "Imágenes subidas", description: `${imageFiles.length} imagen(es) agregada(s).` });
    } catch {
      toast({
        title: "Error",
        description: "No se pudieron subir las imágenes.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) {
      e.target.value = "";
      return;
    }
    await processAppendNewFlights(Array.from(files));
    e.target.value = "";
  };

  const handleBulkDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setBulkDragOver(false);
    if (uploading) return;
    const files = Array.from(e.dataTransfer.files || []).filter(isImageFile);
    if (files.length) void processAppendNewFlights(files);
  };

  const addEmpty = () => {
    setFlights((prev) => [
      ...prev,
      { imageUrl: "", cabinBaggage: false, holdBaggage: false, flightRole: "outbound" },
    ]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[90vh] flex flex-col"
        onDragOver={(e) => {
          if (dataTransferHasFiles(e.dataTransfer)) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Vuelos del plan</DialogTitle>
          <DialogDescription>
            Por cada imagen elige si corresponde a ida, regreso o conexión/vuelo interno. El orden y el tipo definen cómo se arma el PDF en cotizaciones (especialmente en planes bloqueo).
          </DialogDescription>
        </DialogHeader>
        <div
          className="flex-1 overflow-y-auto space-y-4 py-4"
          onDragOver={(e) => {
            if (dataTransferHasFiles(e.dataTransfer)) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <div
            ref={setBulkDropNode}
            className={cn(
              "rounded-xl border-2 border-dashed transition-all cursor-pointer",
              "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
              bulkDragOver && "border-primary bg-primary/10",
              uploading && "opacity-80 cursor-wait",
              !planName.trim() && "ring-1 ring-amber-500/50"
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              if (dataTransferHasFiles(e.dataTransfer)) {
                e.dataTransfer.dropEffect = "copy";
              }
              if (!uploading) setBulkDragOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dataTransferHasFiles(e.dataTransfer)) {
                e.dataTransfer.dropEffect = "copy";
              }
              if (!uploading) setBulkDragOver(true);
            }}
            onDragLeave={(e) => {
              const next = e.relatedTarget as Node | null;
              if (e.currentTarget.contains(next)) return;
              setBulkDragOver(false);
            }}
            onDrop={handleBulkDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            <div className="flex flex-col items-center justify-center py-8 px-4">
              {uploading ? (
                <>
                  <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                  <span className="text-sm font-medium text-foreground">Subiendo imágenes...</span>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium text-foreground">
                    Arrastra imágenes aquí o haz clic para seleccionar
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    PNG, JPG o WebP · Varios archivos a la vez
                  </span>
                </>
              )}
            </div>
          </div>
          <Button variant="outline" size="sm" type="button" onClick={addEmpty} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Agregar ranura vacía
          </Button>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={flights.map((f, i) => f.imageUrl || `empty-${i}`)}
              strategy={rectSortingStrategy}
            >
              <div className="space-y-3">
                {flights.map((item, i) => (
                  <SortableFlightCard
                    key={item.imageUrl || `empty-${i}`}
                    item={item}
                    index={i}
                    onUpdate={(f) => updateFlight(i, f)}
                    onRemove={() => removeFlight(i)}
                    onUploadForIndex={(idx, url) => updateFlight(idx, { imageUrl: url })}
                    onAppendAfterUpload={appendUrlsAsFlights}
                    planName={planName}
                    uploading={uploading}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {flights.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay vuelos internos configurados. Sube imágenes o agrega uno vacío.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
