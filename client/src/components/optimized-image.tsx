/**
 * OptimizedImage: Carga rápida sin sacrificar calidad
 *
 * - loading="lazy": Carga la imagen completa en alta definición cuando entra al viewport.
 *   NO reduce calidad, solo difiere el momento de carga.
 * - decoding="async": Decodificación no bloqueante para mejor rendimiento.
 * - fetchpriority="high": Para imágenes above-the-fold (prioridad alta).
 * - Skeleton mientras carga: Feedback visual inmediato.
 *
 * La imagen siempre se carga en resolución completa; no hay compresión ni reducción de calidad.
 */
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  /** URL de la imagen (siempre se carga en alta definición) */
  src: string;
  alt: string;
  /** Si true, el navegador prioriza esta imagen (above-the-fold) */
  priority?: boolean;
  /** Clase para el contenedor (ej: aspect-video, w-32 h-24) */
  containerClassName?: string;
  /** Clase para la imagen */
  imageClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  containerClassName,
  imageClassName,
  className,
  ...imgProps
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    <div className={cn("relative overflow-hidden bg-muted", containerClassName)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          !isLoaded && "opacity-0",
          imageClassName,
          className
        )}
        {...imgProps}
      />
    </div>
  );
}
