/**
 * Supabase Storage - Gestión de buckets e imágenes
 *
 * Estructura de buckets:
 * - images: Imágenes generales (vuelos, adjuntos de cotizaciones)
 * - plan-{slug}: Galería principal del plan, mapa del itinerario y audio descriptivo (MP3)
 * - plan-{slug}-hotels: Galería de imágenes de hoteles (solo ese plan, PDF «Adicionales»)
 * - plan-{slug}-adicionales: Galería Adicionales (misma página del PDF que hoteles)
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { logger } from "./logger";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabase;
}

export function isSupabaseStorageEnabled(): boolean {
  return !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

/** Convierte nombre de plan a slug para bucket: "Turquía Esencial" → "turquia-esencial" */
export function destinationNameToBucketSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Nombre del bucket para un plan: plan-{slug} */
export function getPlanBucketName(destinationName: string): string {
  const slug = destinationNameToBucketSlug(destinationName);
  return `plan-${slug}`;
}

/** Bucket solo para la galería de hoteles del plan: plan-{slug}-hotels */
export function getPlanHotelsBucketName(destinationName: string): string {
  return `${getPlanBucketName(destinationName)}-hotels`;
}

/** Bucket para la galería Adicionales del plan: plan-{slug}-adicionales */
export function getPlanAdicionalesBucketName(destinationName: string): string {
  return `${getPlanBucketName(destinationName)}-adicionales`;
}

const BUCKET_IMAGES = "images";
const BUCKET_MEDICAL_ASSISTANCE = "medical-assistance";
const BUCKET_ITINERARY_MAPS = "itinerary-maps";

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

/** Buckets `plan-{slug}` (galería principal + mapa + audio MP3). No incluye -hotels ni -adicionales. */
export function isPlanMainGalleryBucket(bucketName: string): boolean {
  return (
    bucketName.startsWith("plan-") &&
    !bucketName.endsWith("-hotels") &&
    !bucketName.endsWith("-adicionales")
  );
}

function defaultImageBucketOptions(publicFlag: boolean) {
  return {
    public: publicFlag,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: [...IMAGE_MIME_TYPES],
  };
}

/** Límite mayor para galería + audio descriptivo (MP3 hasta ~40 MB en upload). */
function planMainGalleryBucketOptions(publicFlag: boolean) {
  return {
    public: publicFlag,
    fileSizeLimit: 50 * 1024 * 1024,
    allowedMimeTypes: [...IMAGE_MIME_TYPES, "audio/mpeg", "audio/mp3"],
  };
}

/** Carpeta dentro del bucket del plan donde viven los mapas del itinerario (por plan, no compartida) */
export const ITINERARY_MAP_STORAGE_PREFIX = "mapa-itinerario";

/** Bucket general para imágenes (vuelos, etc.) */
export function getImagesBucketName(): string {
  return BUCKET_IMAGES;
}

/** Bucket dedicado para imágenes de asistencia médica (compartido entre planes) */
export function getMedicalAssistanceBucketName(): string {
  return BUCKET_MEDICAL_ASSISTANCE;
}

/** Bucket legado para mapas del itinerario (antes era compartido; ya no se usa para subidas nuevas) */
export function getItineraryMapsBucketName(): string {
  return BUCKET_ITINERARY_MAPS;
}

/** Asegura que el bucket existe. Crea si no existe.
 * Buckets principales de plan (`plan-{slug}`) permiten imágenes + MP3 y límite 50 MB.
 * Si el bucket ya existía solo con imágenes, intenta actualizar MIME y límite (Supabase). */
export async function ensureBucketExists(
  bucketName: string,
  options?: { public?: boolean }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: buckets } = await client.storage.listBuckets();
    const existing = buckets?.find((b) => b.name === bucketName);
    const publicFlag = options?.public ?? true;
    const isPlanMain = isPlanMainGalleryBucket(bucketName);

    if (!existing) {
      const bucketOpts = isPlanMain
        ? planMainGalleryBucketOptions(publicFlag)
        : defaultImageBucketOptions(publicFlag);
      const { error } = await client.storage.createBucket(bucketName, bucketOpts);
      if (error) {
        logger.error("[SupabaseStorage] Error creating bucket", { bucketName, error });
        return false;
      }
      logger.info("[SupabaseStorage] Bucket created", { bucketName });
      return true;
    }

    if (isPlanMain) {
      const { error: updateErr } = await client.storage.updateBucket(
        bucketName,
        planMainGalleryBucketOptions(existing.public ?? publicFlag),
      );
      if (updateErr) {
        logger.warn("[SupabaseStorage] updateBucket plan principal (MIME/tamaño)", {
          bucketName,
          message: updateErr.message,
        });
      }
    }

    return true;
  } catch (err) {
    logger.error("[SupabaseStorage] ensureBucketExists error", { bucketName, err });
    return false;
  }
}

/** Sube un archivo a un bucket. Retorna la URL pública si el bucket es público. */
export async function uploadToBucket(
  bucketName: string,
  path: string,
  file: Buffer,
  contentType?: string
): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const created = await ensureBucketExists(bucketName);
  if (!created) return null;

  const { data, error } = await client.storage.from(bucketName).upload(path, file, {
    contentType: contentType || "image/jpeg",
    upsert: true,
  });

  if (error) {
    logger.error("[SupabaseStorage] Upload error", { bucketName, path, error: error.message });
    throw new Error(error.message || "Error al subir a Supabase");
  }

  const { data: urlData } = client.storage.from(bucketName).getPublicUrl(data.path);
  return urlData.publicUrl;
}

/** Obtiene la URL pública de un archivo en un bucket público */
export function getPublicUrl(bucketName: string, path: string): string {
  const client = getSupabaseClient();
  if (!client) return "";

  const { data } = client.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/** Descarga un archivo de un bucket como Buffer */
export async function downloadFromBucket(
  bucketName: string,
  path: string
): Promise<Buffer | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const { data } = client.storage.from(bucketName).getPublicUrl(path);

  try {
    const res = await fetch(data.publicUrl);
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    logger.error("[SupabaseStorage] Download error", { bucketName, path, err });
    return null;
  }
}

/** Parsea una URL de Supabase Storage para obtener bucket y path */
export function parseSupabaseStorageUrl(url: string): { bucket: string; path: string } | null {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
    if (match) {
      return { bucket: match[1], path: match[2] };
    }
  } catch {
    // ignore
  }
  return null;
}

/** Lista archivos en la raíz de un bucket */
export async function listBucketFiles(bucketName: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.storage.from(bucketName).list("", { limit: 500 });
    if (error) {
      logger.error("[SupabaseStorage] List error", { bucketName, error: error.message });
      return [];
    }
    return (data || []).filter((f) => f.name && !f.name.startsWith(".")).map((f) => f.name);
  } catch (err) {
    logger.error("[SupabaseStorage] listBucketFiles error", { bucketName, err });
    return [];
  }
}

/** Lista archivos en una carpeta del bucket (un nivel). Devuelve paths completos `carpeta/archivo.ext`. */
export async function listBucketFilesInFolder(bucketName: string, folderPath: string): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const prefix = folderPath.replace(/^\/+|\/+$/g, "");
  if (!prefix || prefix.includes("..")) return [];
  try {
    const { data, error } = await client.storage.from(bucketName).list(prefix, { limit: 500 });
    if (error) {
      logger.error("[SupabaseStorage] List folder error", { bucketName, prefix, error: error.message });
      return [];
    }
    const rows = (data || []).filter((f) => f.name && !f.name.startsWith("."));
    return rows
      .filter((f) => /\.(jpe?g|png|gif|webp)$/i.test(f.name))
      .map((f) => `${prefix}/${f.name}`);
  } catch (err) {
    logger.error("[SupabaseStorage] listBucketFilesInFolder error", { bucketName, prefix, err });
    return [];
  }
}

/** Elimina archivos de un bucket */
export async function removeFromBucket(bucketName: string, paths: string[]): Promise<boolean> {
  if (!paths.length) return true;
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.storage.from(bucketName).remove(paths);
    if (error) {
      logger.error("[SupabaseStorage] Remove error", { bucketName, error: error.message });
      return false;
    }
    return true;
  } catch (err) {
    logger.error("[SupabaseStorage] removeFromBucket error", { bucketName, err });
    return false;
  }
}

/** Lista recursivamente todos los archivos de un bucket (incluye subcarpetas) */
async function listBucketFilesRecursive(bucketName: string, prefix = ""): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.storage.from(bucketName).list(prefix || "", { limit: 1000 });
    if (error) {
      logger.error("[SupabaseStorage] List recursive error", { bucketName, prefix, error: error.message });
      return [];
    }
    const paths: string[] = [];
    for (const item of data || []) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id == null && item.name) {
        // Es una carpeta (id null/undefined)
        const nested = await listBucketFilesRecursive(bucketName, fullPath);
        paths.push(...nested);
      } else {
        paths.push(fullPath);
      }
    }
    return paths;
  } catch (err) {
    logger.error("[SupabaseStorage] listBucketFilesRecursive error", { bucketName, prefix, err });
    return [];
  }
}

/** Buckets compartidos que NUNCA deben eliminarse (no son de planes) */
const SHARED_BUCKETS = new Set(["images", "medical-assistance", "itinerary-maps"]);

/** Vacía un bucket eliminando todos sus archivos. Usa lotes de 100 por límites de API. */
async function emptyBucket(bucketName: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const files = await listBucketFilesRecursive(bucketName);
  if (files.length === 0) return true;
  const BATCH_SIZE = 100;
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const ok = await removeFromBucket(bucketName, batch);
    if (!ok) return false;
  }
  return true;
}

/** Lista todos los buckets en Supabase */
export async function listAllBuckets(): Promise<string[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.storage.listBuckets();
    if (error) {
      logger.error("[SupabaseStorage] listAllBuckets error", { error: error.message });
      return [];
    }
    return (data || []).map((b) => b.name);
  } catch (err) {
    logger.error("[SupabaseStorage] listAllBuckets error", { err });
    return [];
  }
}

/** Elimina buckets de planes que no tienen un plan asociado. Retorna { deleted: string[], errors: string[] } */
export async function deleteOrphanPlanBuckets(
  destinationNames: string[]
): Promise<{ deleted: string[]; errors: { bucket: string; error: string }[] }> {
  const client = getSupabaseClient();
  const result = { deleted: [] as string[], errors: [] as { bucket: string; error: string }[] };
  if (!client) {
    result.errors.push({ bucket: "(all)", error: "Supabase no configurado" });
    return result;
  }

  const validPlanBucketNames = new Set(
    destinationNames.flatMap((name) => [
      getPlanBucketName(name),
      getPlanHotelsBucketName(name),
      getPlanAdicionalesBucketName(name),
    ])
  );
  const allBuckets = await listAllBuckets();
  const planBucketPrefix = "plan-";
  const orphanBuckets = allBuckets.filter(
    (b) =>
      b.startsWith(planBucketPrefix) &&
      !SHARED_BUCKETS.has(b) &&
      !validPlanBucketNames.has(b)
  );

  for (const bucketName of orphanBuckets) {
    try {
      const emptied = await emptyBucket(bucketName);
      if (!emptied) {
        result.errors.push({ bucket: bucketName, error: "No se pudieron eliminar los archivos" });
        continue;
      }
      const { error } = await client.storage.deleteBucket(bucketName);
      if (error) {
        result.errors.push({ bucket: bucketName, error: error.message });
        continue;
      }
      result.deleted.push(bucketName);
      logger.info("[SupabaseStorage] Bucket huérfano eliminado", { bucketName });
    } catch (err) {
      result.errors.push({ bucket: bucketName, error: (err as Error).message });
    }
  }
  return result;
}

/** Elimina un bucket por nombre (vacía y delete). Ok si no existe. */
async function deleteStorageBucketByName(bucketName: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase no configurado" };
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      logger.info("[SupabaseStorage] Bucket no existe, nada que eliminar", { bucketName });
      return { ok: true };
    }
    const emptied = await emptyBucket(bucketName);
    if (!emptied) {
      return { ok: false, error: `No se pudieron eliminar los archivos del bucket ${bucketName}` };
    }
    const { error } = await client.storage.deleteBucket(bucketName);
    if (error) {
      logger.error("[SupabaseStorage] Error eliminando bucket", { bucketName, error: error.message });
      return { ok: false, error: error.message };
    }
    logger.info("[SupabaseStorage] Bucket eliminado", { bucketName });
    return { ok: true };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error("[SupabaseStorage] deleteStorageBucketByName error", { bucketName, err });
    return { ok: false, error: msg };
  }
}

/** Elimina los buckets del plan (galería principal, hoteles y adicionales). */
export async function deletePlanBucket(destinationName: string): Promise<{ deleted: boolean; error?: string }> {
  const main = await deleteStorageBucketByName(getPlanBucketName(destinationName));
  const hotels = await deleteStorageBucketByName(getPlanHotelsBucketName(destinationName));
  const adicionales = await deleteStorageBucketByName(getPlanAdicionalesBucketName(destinationName));
  if (!main.ok) return { deleted: false, error: main.error };
  if (!hotels.ok) return { deleted: false, error: hotels.error };
  if (!adicionales.ok) return { deleted: false, error: adicionales.error };
  return { deleted: true };
}

async function reorderNumberedImagesInBucket(
  bucketName: string,
  imageUrls: string[]
): Promise<{ urls: string[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { urls: [], error: "Supabase no configurado" };

  const created = await ensureBucketExists(bucketName);
  if (!created) return { urls: [], error: "No se pudo acceder al bucket" };

  const buffers: { buffer: Buffer; ext: string }[] = [];
  for (const url of imageUrls) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ct = res.headers.get("content-type") || "";
      let ext = "jpg";
      if (ct.includes("png")) ext = "png";
      else if (ct.includes("gif")) ext = "gif";
      else if (ct.includes("webp")) ext = "webp";
      else {
        const m = url.match(/\.(jpe?g|png|gif|webp)(?:\?|$)/i);
        if (m) ext = m[1].toLowerCase().replace("jpeg", "jpg");
      }
      buffers.push({ buffer, ext });
    } catch (err) {
      logger.error("[SupabaseStorage] Download for reorder failed", { url: url.slice(0, 80), err });
      return { urls: [], error: "Error al descargar imagen" };
    }
  }

  const existingFiles = await listBucketFiles(bucketName);
  if (existingFiles.length > 0) {
    const removed = await removeFromBucket(bucketName, existingFiles);
    if (!removed) return { urls: [], error: "Error al eliminar archivos anteriores" };
  }

  const newUrls: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const { buffer, ext } = buffers[i];
    const path = `${i + 1}.${ext}`;
    try {
      const url = await uploadToBucket(bucketName, path, buffer, `image/${ext === "jpg" ? "jpeg" : ext}`);
      if (!url) return { urls: newUrls, error: `Error al subir imagen ${i + 1}` };
      newUrls.push(url);
    } catch (err) {
      logger.error("[SupabaseStorage] Upload during reorder failed", { path, err });
      return { urls: newUrls, error: `Error al subir imagen ${i + 1}` };
    }
  }
  return { urls: newUrls };
}

/** Reordena imágenes de la galería del plan (bucket plan-{slug}). */
export async function reorderPlanImages(
  planName: string,
  imageUrls: string[]
): Promise<{ urls: string[]; error?: string }> {
  return reorderNumberedImagesInBucket(getPlanBucketName(planName), imageUrls);
}

/** Reordena imágenes de la galería de hoteles (bucket plan-{slug}-hotels). */
export async function reorderPlanHotelsImages(
  planName: string,
  imageUrls: string[]
): Promise<{ urls: string[]; error?: string }> {
  return reorderNumberedImagesInBucket(getPlanHotelsBucketName(planName), imageUrls);
}

/** Reordena imágenes de la galería Adicionales (bucket plan-{slug}-adicionales). */
export async function reorderPlanAdicionalesImages(
  planName: string,
  imageUrls: string[]
): Promise<{ urls: string[]; error?: string }> {
  return reorderNumberedImagesInBucket(getPlanAdicionalesBucketName(planName), imageUrls);
}
