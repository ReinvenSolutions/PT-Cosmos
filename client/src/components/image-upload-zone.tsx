import { useState, useRef } from "react";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageUploadZoneProps {
  imageUrl: string;
  onImageChange: (url: string) => void;
  onUpload: (files: File[]) => Promise<string | null | undefined>;
  label?: string;
  description?: string;
  className?: string;
  /** URL de imagen por defecto cuando imageUrl está vacío (ej: asistencia médica del sistema) */
  defaultImageUrl?: string;
  /** Etiqueta a mostrar cuando se usa la imagen por defecto */
  defaultImageLabel?: string;
}

/** Single image upload zone with drag & drop and click to select */
export function ImageUploadZone({
  imageUrl,
  onImageChange,
  onUpload,
  label,
  description,
  className,
  defaultImageUrl,
  defaultImageLabel,
}: ImageUploadZoneProps) {
  const displayUrl = imageUrl || defaultImageUrl;
  const isUsingDefault = !imageUrl && !!defaultImageUrl;
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setUploading(true);
    try {
      const url = await onUpload(imageFiles);
      if (url) onImageChange(url);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (uploading) return;
    handleFiles(Array.from(e.dataTransfer.files || []));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
    e.target.value = "";
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && <p className="text-sm font-medium">{label}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <div
        className={cn(
          "rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[120px] flex items-center justify-center",
          "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
          dragOver && "border-primary bg-primary/10"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleInputChange}
          disabled={uploading}
        />
        {displayUrl ? (
          <div className="relative w-full p-4">
            <img
              src={displayUrl}
              alt=""
              className="max-h-48 mx-auto object-contain rounded-lg"
            />
            {isUsingDefault && defaultImageLabel && (
              <p className="text-xs text-muted-foreground text-center mt-2 font-medium">
                {defaultImageLabel}
              </p>
            )}
            <div className="flex justify-center gap-2 mt-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploading ? "Subiendo..." : isUsingDefault ? "Subir imagen personalizada" : "Cambiar"}
              </Button>
              {!isUsingDefault && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onImageChange("");
                  }}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4">
            {uploading ? (
              <>
                <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin mb-2" />
                <span className="text-sm font-medium">Subiendo...</span>
              </>
            ) : (
              <>
                <Upload className="w-10 h-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium">Arrastra o haz clic para subir</span>
                <span className="text-xs text-muted-foreground mt-0.5">PNG, JPG o WebP</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
