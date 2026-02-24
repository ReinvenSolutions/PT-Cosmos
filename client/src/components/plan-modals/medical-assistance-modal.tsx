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
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MedicalAssistanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicalAssistanceInfo: string;
  medicalAssistanceImageUrl: string;
  onSave: (info: string, imageUrl: string) => void;
  planName: string;
}

export function MedicalAssistanceModal({
  open,
  onOpenChange,
  medicalAssistanceInfo,
  medicalAssistanceImageUrl,
  onSave,
  planName,
}: MedicalAssistanceModalProps) {
  const [info, setInfo] = useState(medicalAssistanceInfo);
  const [imageUrl, setImageUrl] = useState(medicalAssistanceImageUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setInfo(medicalAssistanceInfo);
    setImageUrl(medicalAssistanceImageUrl);
  }, [medicalAssistanceInfo, medicalAssistanceImageUrl, open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setInfo(medicalAssistanceInfo);
      setImageUrl(medicalAssistanceImageUrl);
    }
    onOpenChange(next);
  };

  const handleSave = () => {
    onSave(info, imageUrl);
    onOpenChange(false);
    toast({ title: "Asistencia médica guardada", description: "Los cambios se aplicarán al guardar el plan." });
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
      formData.append("galleryIndex", "medical-assistance");
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setImageUrl(url);
      toast({ title: "Imagen subida", description: "La imagen de asistencia médica se ha actualizado." });
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
          <DialogTitle>Asistencia médica</DialogTitle>
          <DialogDescription>
            Información e imagen de asistencia médica que se exporta en el PDF del plan.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Información de asistencia médica</Label>
            <Textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              placeholder="Ej: Seguro de viaje y asistencia 24 horas incluido. Cobertura médica internacional."
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Imagen de asistencia médica</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Imagen que se exporta en el PDF. Si no subes una personalizada, se usa la por defecto.
            </p>
            <div className="flex gap-3 items-start">
              <div className="relative w-32 h-24 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={imageUrl || "/images/default/medical-assistance.png"}
                  alt="Asistencia médica"
                  className="max-w-full max-h-full object-contain"
                />
                {!imageUrl && (
                  <span className="absolute bottom-0 left-0 right-0 text-[10px] text-center bg-muted/80 px-1 py-0.5">
                    Por defecto
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-2">
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
                {imageUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setImageUrl("")}
                  >
                    Quitar imagen
                  </Button>
                )}
              </div>
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
