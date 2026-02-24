import { useState, useCallback } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { getCroppedAvatar } from "@/lib/cropImage";

/** Variante inline: se usa dentro de un DialogContent ya abierto (evita animación de zoom que rompe el Cropper). */
export function AvatarCropInline({
  imageSrc,
  onComplete,
  onCancel,
}: {
  imageSrc: string;
  onComplete: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);
  const onCropAreaChange = useCallback((_: Area, pixels: Area) => setCroppedAreaPixels(pixels), []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedAvatar(imageSrc, croppedAreaPixels, "image/jpeg");
      await onComplete(blob);
    } catch (err) {
      console.error("Error al recortar:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Recortar foto de perfil</DialogTitle>
        <DialogDescription>
          Ajusta el recorte arrastrando y usando el zoom. La foto se mostrará en círculo.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4 py-2">
        <div className="relative h-[280px] w-full rounded-lg overflow-hidden bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onCropAreaChange={onCropAreaChange}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Zoom</label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={([v]) => setZoom(v ?? 1)}
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
          Cancelar
        </Button>
        <Button onClick={handleApply} disabled={isProcessing || !croppedAreaPixels}>
          {isProcessing ? (
            <>
              <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Procesando...
            </>
          ) : (
            "Aplicar"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

interface AvatarCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onComplete: (blob: Blob) => Promise<void>;
  onCancel: () => void;
}

export function AvatarCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onComplete,
  onCancel,
}: AvatarCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const blob = await getCroppedAvatar(imageSrc, croppedAreaPixels, "image/jpeg");
      await onComplete(blob);
      onOpenChange(false);
    } catch (err) {
      console.error("Error al recortar:", err);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Recortar foto de perfil</DialogTitle>
          <DialogDescription>
            Ajusta el recorte arrastrando la imagen y usando el zoom. La foto se mostrará en círculo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative h-[280px] w-full rounded-lg overflow-hidden bg-muted">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onCropAreaChange={onCropAreaChange}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zoom</label>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={([v]) => setZoom(v ?? 1)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={isProcessing || !croppedAreaPixels}>
            {isProcessing ? (
              <>
                <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Procesando...
              </>
            ) : (
              "Aplicar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
