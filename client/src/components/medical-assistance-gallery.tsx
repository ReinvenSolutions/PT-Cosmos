import { useState, useRef, useEffect } from "react";
import { Upload, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const DEFAULT_IMAGE_URL = "/images/default/medical-assistance.png";

interface MedicalAssistanceGalleryProps {
  selectedUrl: string;
  onSelect: (url: string) => void;
  /** Si true, no requiere planName para subir (sube al bucket compartido) */
  allowUploadWithoutPlan?: boolean;
  planName?: string;
}

export function MedicalAssistanceGallery({
  selectedUrl,
  onSelect,
  allowUploadWithoutPlan = true,
  planName = "",
}: MedicalAssistanceGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<{ images: { path: string; url: string }[] }>({
    queryKey: ["/api/admin/medical-assistance-images"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (path: string) => {
      const res = await apiRequest("DELETE", `/api/admin/medical-assistance-images?path=${encodeURIComponent(path)}`);
      return res.json();
    },
    onSuccess: (_, deletedPath) => {
      const wasSelected = data?.images?.find((i) => i.path === deletedPath)?.url === selectedUrl;
      if (wasSelected) onSelect("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/medical-assistance-images"] });
      toast({ title: "Imagen eliminada", description: "La imagen se eliminó del catálogo." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
    onSettled: () => setDeletingPath(null),
  });

  const displaySelected = selectedUrl || DEFAULT_IMAGE_URL;
  const isDefaultSelected = !selectedUrl;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (!allowUploadWithoutPlan && !planName.trim()) {
      toast({ title: "Nombre requerido", description: "Ingresa el nombre del plan antes de subir.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("galleryIndex", "medical-assistance");
      if (planName.trim()) formData.append("planName", planName.trim());
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Error al subir");
      }
      const { url } = await res.json();
      onSelect(url);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/medical-assistance-images"] });
      toast({ title: "Imagen subida", description: "Se agregó al catálogo de asistencia médica." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingPath(path);
    deleteMutation.mutate(path);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Selecciona una imagen del catálogo o sube una nueva. La imagen por defecto del sistema está siempre disponible.
      </p>

      {/* Imagen seleccionada actual */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Imagen en uso para este plan</p>
        <div className="flex items-center gap-3">
          <div className="w-32 h-24 rounded-lg border-2 border-primary/50 overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
            <img
              src={displaySelected}
              alt="Asistencia médica seleccionada"
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <div className="text-sm">
            {isDefaultSelected ? (
              <span className="text-muted-foreground">Imagen por defecto del sistema</span>
            ) : (
              <span className="text-muted-foreground">Imagen personalizada</span>
            )}
          </div>
        </div>
      </div>

      {/* Galería: default + imágenes del bucket */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Catálogo de imágenes</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Opción por defecto */}
          <button
            type="button"
            onClick={() => onSelect("")}
            className={cn(
              "relative rounded-lg border-2 overflow-hidden transition-all hover:scale-[1.02] aspect-[4/3] flex items-center justify-center bg-muted/30",
              isDefaultSelected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-transparent hover:border-muted-foreground/40"
            )}
          >
            <img src={DEFAULT_IMAGE_URL} alt="Por defecto" className="max-w-full max-h-full object-contain p-1" />
            {isDefaultSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="rounded-full bg-primary p-1.5">
                  <Check className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            )}
            <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-background/90 py-0.5">Por defecto</span>
          </button>

          {/* Imágenes del bucket */}
          {isLoading ? (
            <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : (
            data?.images?.map((img) => {
              const isSelected = selectedUrl === img.url;
              const isDeleting = deletingPath === img.path;
              return (
                <div
                  key={img.path}
                  className={cn(
                    "relative rounded-lg border-2 overflow-hidden transition-all group aspect-[4/3]",
                    isSelected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-transparent hover:border-muted-foreground/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(img.url)}
                    className="w-full h-full flex items-center justify-center bg-muted/30 p-1"
                  >
                    <img src={img.url} alt="" className="max-w-full max-h-full object-contain rounded" />
                  </button>
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-primary p-1.5">
                        <Check className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-1 right-1 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => handleDelete(img.path, e)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zona de subir nueva */}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-all cursor-pointer",
          "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          uploading && "opacity-70 pointer-events-none"
        )}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading}
        />
        <div className="flex flex-col items-center justify-center py-6 px-4">
          {uploading ? (
            <>
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
              <span className="text-sm font-medium">Subiendo...</span>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-muted-foreground mb-2" />
              <span className="text-sm font-medium">Subir nueva imagen al catálogo</span>
              <span className="text-xs text-muted-foreground mt-0.5">PNG, JPG o WebP</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
