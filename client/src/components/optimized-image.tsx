/**
 * Imagen con tamaño de visualización (thumb / card / hero) y fallback al original
 * si Supabase no puede transformar el archivo.
 */
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { displayImageUrl, type ImagePreset } from "@/lib/image-url";
import { cn } from "@/lib/utils";

interface OptimizedImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "loading"> {
  src: string;
  alt: string;
  /** Si true, el navegador prioriza esta imagen (above-the-fold) */
  priority?: boolean;
  /** thumb ~160px, card ~800px, hero ~1600px, full = archivo original */
  preset?: ImagePreset;
  containerClassName?: string;
  imageClassName?: string;
}

export function OptimizedImage({
  src,
  alt,
  priority = false,
  preset = "card",
  containerClassName,
  imageClassName,
  className,
  ...imgProps
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [useOriginal, setUseOriginal] = useState(false);
  const displaySrc = useOriginal ? src : displayImageUrl(src, preset);

  useEffect(() => {
    setIsLoaded(false);
    setUseOriginal(false);
  }, [src, preset]);

  return (
    <div className={cn("relative overflow-hidden bg-muted", containerClassName)}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 rounded-none" />
      )}
      <img
        src={displaySrc}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          if (!useOriginal && displaySrc !== src) setUseOriginal(true);
          else setIsLoaded(true);
        }}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-200",
          !isLoaded && "opacity-0",
          imageClassName,
          className
        )}
        {...imgProps}
        {...({ fetchpriority: priority ? "high" : "auto" } as Record<string, string>)}
      />
    </div>
  );
}
