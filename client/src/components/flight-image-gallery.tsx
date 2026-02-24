import { useState, useRef } from "react";
import { Upload, X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
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

function SortableFlightImage({
  url,
  index,
  onRemove,
}: {
  url: string;
  index: number;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col rounded-lg border overflow-hidden bg-muted/20 shadow-sm hover:shadow-md transition-shadow",
        isDragging && "opacity-90 shadow-lg z-50 ring-2 ring-primary"
      )}
    >
      <div className="aspect-[4/3] flex items-center justify-center bg-muted/30 p-2 relative">
        <img
          src={url}
          alt={`Imagen ${index + 1}`}
          className="max-w-full max-h-full w-auto h-auto object-contain rounded-lg pointer-events-none"
        />
        <button
          type="button"
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing p-1.5 rounded-md bg-background/90 border shadow-sm hover:bg-muted touch-none"
          {...attributes}
          {...listeners}
          aria-label="Arrastrar para reordenar"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
      <div className="flex items-center justify-between px-2 py-1.5 border-t bg-background/90">
        <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 -mr-1"
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

interface FlightImageGalleryProps {
  images: string[];
  setImages: (urls: string[] | ((prev: string[]) => string[])) => void;
  onFilesUpload: (files: File[]) => Promise<void>;
  isUploading: boolean;
  label: string;
  description?: string;
  /** id único para el input (para tests) */
  inputId?: string;
}

export function FlightImageGallery({
  images,
  setImages,
  onFilesUpload,
  isUploading,
  label,
  description,
  inputId,
}: FlightImageGalleryProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.indexOf(active.id as string);
    const newIndex = images.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(images, oldIndex, newIndex);
    setImages(reordered);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesUpload(files);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (isUploading) return;
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );
    if (files.length > 0) onFilesUpload(files);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {description ?? `Sube capturas del ${label}. Puedes arrastrar imágenes aquí o hacer clic para seleccionar. El orden que definas se usará en el PDF.`}
      </p>

      {/* Zona de drop + botón de subir */}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-all cursor-pointer",
          "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          dragOver && "border-primary bg-primary/10"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!isUploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          id={inputId}
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          disabled={isUploading}
        />
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {isUploading ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-sm font-medium text-foreground">Subiendo imágenes...</span>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
              <span className="text-sm font-medium text-foreground">
                Arrastra imágenes o haz clic para subir
              </span>
              <span className="text-xs text-muted-foreground mt-0.5">
                PNG, JPG o WebP · Múltiples archivos
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mini galería ordenable */}
      {images.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Arrastra las imágenes para cambiar el orden en el PDF. Haz clic en la X para eliminar.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {images.map((url, index) => (
                  <SortableFlightImage
                    key={url}
                    url={url}
                    index={index}
                    onRemove={() => setImages((prev) => prev.filter((_, i) => i !== index))}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
