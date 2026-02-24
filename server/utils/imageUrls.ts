/**
 * Utilidades para URLs de imágenes - Supabase Storage como fuente principal
 */

const SUPABASE_URL = process.env.SUPABASE_URL;

/** Verifica si Supabase Storage está configurado */
export function useSupabaseStorage(): boolean {
  return !!(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Construye URL pública de Supabase para un bucket y path */
export function getSupabasePublicUrl(bucket: string, filePath: string): string {
  if (!SUPABASE_URL) return "";
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${filePath}`;
}

/** Convierte ruta local /images/destinations/{folder}/{file} a URL Supabase */
export function localToSupabaseUrl(localPath: string): string | null {
  if (!useSupabaseStorage()) return null;
  const match = localPath.match(/^\/images\/destinations\/([^/]+)\/([^/]+)$/);
  if (!match) return null;
  const [, folder, filename] = match;
  return getSupabasePublicUrl(`plan-${folder}`, filename);
}
