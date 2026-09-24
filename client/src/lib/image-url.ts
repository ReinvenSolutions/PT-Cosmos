/**
 * Versión de visualización para fotos en Supabase Storage.
 * El original se conserva para el visor ampliado y el PDF.
 * Si el proyecto no tiene transformaciones de imagen, OptimizedImage vuelve al archivo original.
 */

export type ImagePreset = "thumb" | "card" | "hero" | "full";

const WIDTH: Record<Exclude<ImagePreset, "full">, number> = {
  thumb: 160,
  card: 800,
  hero: 1600,
};

const OBJECT_PUBLIC = /^(https:\/\/[^/]+)\/storage\/v1\/object\/public\/(.+)$/;

export function displayImageUrl(src: string, preset: ImagePreset = "card"): string {
  if (!src || preset === "full") return src;
  const match = src.match(OBJECT_PUBLIC);
  if (!match) return src;
  const path = match[2].split("?")[0];
  const width = WIDTH[preset];
  return `${match[1]}/storage/v1/render/image/public/${path}?width=${width}&quality=75&resize=cover`;
}
