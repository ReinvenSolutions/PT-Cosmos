import { useState, useRef, useMemo } from "react";
import { Upload, X, Check } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ItineraryMapGalleryProps {
  selectedUrl: string;
  onSelect: (url: string) => void;
  allowUploadWithoutPlan?: boolean;
  planName?: string;
}

type MapGalleryItem = { path: string; url: string; isOrphanSelection?: boolean };

/** Coincide con las reglas de DELETE /api/admin/itinerary-map-images (mapa legado o carpeta mapa-itinerario del plan). */
function canDeleteItineraryMapStorageUrl(url: string): boolean {
  if (!url.startsWith("https://")) return false;
  try {
    const pathname = new URL(url).pathname;
    const m = pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (!m) return false;
    const bucket = m[1];
    const storagePath = decodeURIComponent(m[2]);
    if (storagePath.includes("..")) return false;
    const fileName = storagePath.split("/").pop() || "";
    if (!/\.(jpe?g|png|gif|webp)$/i.test(fileName)) return false;
    if (bucket === "itinerary-maps" && !storagePath.includes("/")) return true;
    if (bucket.startsWith("plan-") && /^mapa-itinerario\/[^/]+$/.test(storagePath)) return true;
    return false;
  } catch {
    return false;
  }
}

export function ItineraryMapGallery({
  selectedUrl,
  onSelect,
  allowUploadWithoutPlan = false,
  planName = "",
}: ItineraryMapGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [deletingUrl, setDeletingUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const planNameTrimmed = planName.trim();
  const canQueryMaps = !!planNameTrimmed;

  const { data, isLoading } = useQuery<{ images: { path: string; url: string }[] }>({
    queryKey: ["/api/admin/itinerary-map-images", planNameTrimmed],
    queryFn: async () => {
      const q = new URLSearchParams({ planName: planNameTrimmed });
      const res = await fetch(`/api/admin/itinerary-map-images?${q}`, { credentials: "include" });
      if (!res.ok) {
        const text = await res.text();
        let message = text;
        try {
          const j = JSON.parse(text);
          message = j?.message || j?.error || text;
        } catch {
          /* ignore */
        }
        throw new Error(message || `Error ${res.status}`);
      }
      return res.json();
    },
    enabled: canQueryMaps,
  });

  const galleryItems = useMemo((): MapGalleryItem[] => {
    const fromApi = data?.images ?? [];
    const selectedInApi = selectedUrl && fromApi.some((i) => i.url === selectedUrl);
    if (selectedUrl && !selectedInApi) {
      return [
        {
          path: "__orphan__",
          url: selectedUrl,
          isOrphanSelection: true,
        },
        ...fromApi,
      ];
    }
    return fromApi;
  }, [data?.images, selectedUrl]);

  const deleteMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const res = await apiRequest("DELETE", `/api/admin/itinerary-map-images?url=${encodeURIComponent(imageUrl)}`);
      return res.json();
    },
    onSuccess: (_, deletedUrl) => {
      if (deletedUrl === selectedUrl) onSelect("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/itinerary-map-images"] });
      toast({ title: "Mapa eliminado", description: "El mapa se eliminó del almacenamiento de este plan." });
    },
    onError: (e: Error) => {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    },
    onSettled: () => setDeletingUrl(null),
  });

  const isEmptySelected = !selectedUrl;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (!allowUploadWithoutPlan && !planNameTrimmed) {
      toast({ title: "Nombre requerido", description: "Ingresa el nombre del plan antes de subir.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("galleryIndex", "mapa-itinerario");
      formData.append("planName", planNameTrimmed);
      const res = await fetch("/api/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Error al subir");
      }
      const { url } = await res.json();
      onSelect(url);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/itinerary-map-images"] });
      toast({ title: "Mapa subido", description: "Se guardó en la galería de mapas de este plan." });
    } catch (err) {
      toast({ title: "Error", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = (imageUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingUrl(imageUrl);
    deleteMutation.mutate(imageUrl);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Solo se listan mapas subidos para este plan (mismo nombre de plan que en la pestaña básica). Si no eliges ninguno, los planes de Turquía pueden usar el mapa por defecto del sistema.
      </p>
      {!canQueryMaps && (
        <p className="text-xs text-amber-700 dark:text-amber-500">
          Escribe el nombre del plan en «Información básica» para ver la galería y subir mapas.
        </p>
      )}

      {/* Imagen seleccionada actual */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Mapa en uso para este plan</p>
        <div className="flex items-center gap-3">
          <div className="w-40 h-28 rounded-lg border-2 border-primary/50 overflow-hidden bg-muted/30 flex items-center justify-center shrink-0">
            {selectedUrl ? (
              <img src={selectedUrl} alt="Mapa seleccionado" className="max-w-full max-h-full object-contain" />
            ) : (
              <span className="text-xs text-muted-foreground">Sin mapa</span>
            )}
          </div>
          <div className="text-sm">
            {isEmptySelected ? (
              <span className="text-muted-foreground">Sin mapa (Turquía usa mapa por defecto)</span>
            ) : (
              <span className="text-muted-foreground">Mapa personalizado</span>
            )}
          </div>
        </div>
      </div>

      {/* Galería: opción vacía + imágenes del bucket */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-2">Galería de mapas de este plan</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Opción sin mapa */}
          <button
            type="button"
            onClick={() => onSelect("")}
            className={cn(
              "relative rounded-lg border-2 overflow-hidden transition-all hover:scale-[1.02] aspect-[4/3] flex flex-col items-center justify-center bg-muted/30",
              isEmptySelected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-transparent hover:border-muted-foreground/40"
            )}
          >
            <span className="text-2xl text-muted-foreground">🗺️</span>
            <span className="text-[10px] text-muted-foreground mt-1">Sin mapa</span>
            {isEmptySelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <div className="rounded-full bg-primary p-1.5">
                  <Check className="h-5 w-5 text-primary-foreground" />
                </div>
              </div>
            )}
          </button>

          {/* Imágenes del bucket */}
          {!canQueryMaps ? (
            <div className="col-span-2 flex items-center justify-center py-6 text-muted-foreground text-sm text-center px-2">
              Sin nombre de plan no hay galería que mostrar.
            </div>
          ) : isLoading ? (
            <div className="col-span-2 flex items-center justify-center py-8 text-muted-foreground text-sm">
              Cargando...
            </div>
          ) : (
            galleryItems.map((img) => {
              const isSelected = selectedUrl === img.url;
              const isDeleting = deletingUrl === img.url;
              const canDeleteFromHere = canDeleteItineraryMapStorageUrl(img.url);
              return (
                <div
                  key={img.isOrphanSelection ? `orphan-${img.url}` : img.path}
                  className={cn(
                    "relative rounded-lg border-2 overflow-hidden transition-all group aspect-[4/3]",
                    isSelected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-transparent hover:border-muted-foreground/40",
                    img.isOrphanSelection && "ring-1 ring-amber-500/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(img.url)}
                    className="w-full h-full flex flex-col items-center justify-center bg-muted/30 p-1 gap-0.5"
                  >
                    <img src={img.url} alt="" className="max-w-full max-h-full object-contain rounded" />
                    {img.isOrphanSelection && (
                      <span className="text-[9px] text-amber-700 dark:text-amber-400 px-1 text-center leading-tight">
                        Mapa guardado (otra ubicación); puedes eliminarlo o sustituirlo
                      </span>
                    )}
                  </button>
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center pointer-events-none">
                      <div className="rounded-full bg-primary p-1.5">
                        <Check className="h-5 w-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                  {canDeleteFromHere && (
                    <button
                      type="button"
                      className={cn(
                        "absolute top-1 right-1 h-7 w-7 p-0 rounded-md inline-flex items-center justify-center",
                        "bg-destructive text-destructive-foreground border border-destructive-border",
                        "opacity-0 group-hover:opacity-100 transition-opacity",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                        "disabled:pointer-events-none disabled:opacity-50"
                      )}
                      onClick={(e) => handleDelete(img.url, e)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Zona de subir nueva */}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-all",
          canQueryMaps && !uploading && "cursor-pointer border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          (!canQueryMaps || uploading) && "cursor-not-allowed opacity-60 border-muted-foreground/20",
          uploading && "pointer-events-none"
        )}
        onClick={() => {
          if (!canQueryMaps) {
            toast({
              title: "Nombre requerido",
              description: "Indica el nombre del plan en «Información básica» antes de subir el mapa.",
              variant: "destructive",
            });
            return;
          }
          if (!uploading) fileInputRef.current?.click();
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUpload}
          disabled={uploading || !canQueryMaps}
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
              <span className="text-sm font-medium">Subir mapa para este plan</span>
              <span className="text-xs text-muted-foreground mt-0.5">PNG, JPG o WebP</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
