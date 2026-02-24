import { useState, useEffect, useRef } from "react";
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
import { Plus, Trash2, Upload, GripVertical } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
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
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type InternalFlightItem = {
  imageUrl: string;
  label?: string;
  cabinBaggage?: boolean;
  holdBaggage?: boolean;
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
  planName,
  uploading,
}: {
  item: InternalFlightItem;
  index: number;
  onUpdate: (f: Partial<InternalFlightItem>) => void;
  onRemove: () => void;
  onUploadForIndex: (index: number, url: string) => void;
  planName: string;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
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
          <div className="aspect-[4/3] flex flex-col items-center justify-center bg-muted/30 rounded-lg overflow-hidden shrink-0 relative">
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
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file || !planName.trim()) return;
                    try {
                      const formData = new FormData();
                      formData.append("file", file);
                      formData.append("planName", planName.trim());
                      formData.append("galleryIndex", String(index + 1));
                      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
                      if (!res.ok) throw new Error("Upload failed");
                      const { url } = await res.json();
                      onUploadForIndex(index, url);
                    } catch {
                      // Error handled by parent
                    }
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || !planName.trim()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Subir
                </Button>
              </>
            )}
          </div>
          <div className="space-y-2">
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setFlights(internalFlights);
  }, [internalFlights, open]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !planName.trim()) {
      if (!planName.trim()) {
        toast({
          title: "Nombre requerido",
          description: "Ingresa el nombre del plan antes de subir imágenes.",
          variant: "destructive",
        });
      }
      return;
    }
    setUploading(true);
    try {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
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
        setFlights((prev) => [...prev, { imageUrl: url, cabinBaggage: false, holdBaggage: false }]);
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
      e.target.value = "";
    }
  };

  const addEmpty = () => {
    setFlights((prev) => [...prev, { imageUrl: "", cabinBaggage: false, holdBaggage: false }]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Vuelos internos</DialogTitle>
          <DialogDescription>
            Gestiona las imágenes e información de vuelos internos del plan. Estas imágenes se incluirán en el PDF cuando el plan tenga vuelos internos (ej: Lima-Cusco).
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || !planName.trim()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Subiendo..." : "Subir imágenes"}
            </Button>
            <Button variant="outline" size="sm" onClick={addEmpty}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar vacío
            </Button>
          </div>
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
