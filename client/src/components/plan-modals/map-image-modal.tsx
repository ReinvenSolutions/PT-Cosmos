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
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MapImageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onSave: (imageUrl: string) => void;
  planName: string;
}

export function MapImageModal({
  open,
  onOpenChange,
  imageUrl,
  onSave,
  planName,
}: MapImageModalProps) {
  const [url, setUrl] = useState(imageUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setUrl(imageUrl);
  }, [imageUrl, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) setUrl(imageUrl);
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(url);
    onOpenChange(false);
    toast({ title: "Imagen del mapa guardada", description: "Los cambios se aplicarán al guardar el plan." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !planName.trim()) {
      if (!planName.trim()) {
        toast({
          title: "Nombre requerido",
          description: "Ingresa el nombre del plan antes de subir la imagen.",
          variant: "destructive",
        });
      }
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("planName", planName.trim());
      formData.append("galleryIndex", "mapa-itinerario");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url: uploadedUrl } = await res.json();
      setUrl(uploadedUrl);
      toast({ title: "Imagen subida", description: "La imagen del mapa se ha actualizado." });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo subir la imagen.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Imagen del mapa del itinerario</DialogTitle>
          <DialogDescription>
            Imagen del mapa que se muestra en el itinerario resumido del PDF. Se imprime después del resumen de ciudades.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label>Imagen del mapa</Label>
          <div className="mt-2 flex flex-col gap-3">
            <div className="w-full max-h-48 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden">
              {url ? (
                <img src={url} alt="Mapa del itinerario" className="max-w-full max-h-48 object-contain" />
              ) : (
                <span className="text-sm text-muted-foreground p-4">Sin imagen configurada</span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
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
                {uploading ? "Subiendo..." : "Subir imagen"}
              </Button>
              {url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setUrl("")}
                >
                  Quitar imagen
                </Button>
              )}
            </div>
          </div>
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
