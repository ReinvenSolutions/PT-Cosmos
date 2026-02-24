/**
 * Supabase Storage - Gestión de buckets e imágenes
 *
 * Estructura de buckets:
 * - images: Imágenes generales (vuelos, adjuntos de cotizaciones)
 * - plan-{slug}: Un bucket por plan/destino (ej: plan-turquia-esencial)
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

const BUCKET_IMAGES = "images";
const BUCKET_MEDICAL_ASSISTANCE = "medical-assistance";
const BUCKET_ITINERARY_MAPS = "itinerary-maps";

/** Bucket general para imágenes (vuelos, etc.) */
export function getImagesBucketName(): string {
  return BUCKET_IMAGES;
}

/** Bucket dedicado para imágenes de asistencia médica (compartido entre planes) */
export function getMedicalAssistanceBucketName(): string {
  return BUCKET_MEDICAL_ASSISTANCE;
}

/** Bucket dedicado para mapas del itinerario (compartido entre planes) */
export function getItineraryMapsBucketName(): string {
  return BUCKET_ITINERARY_MAPS;
}

/** Asegura que el bucket existe. Crea si no existe. */
export async function ensureBucketExists(
  bucketName: string,
  options?: { public?: boolean }
): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);

    if (!exists) {
      const { error } = await client.storage.createBucket(bucketName, {
        public: options?.public ?? true,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
      });
      if (error) {
        logger.error("[SupabaseStorage] Error creating bucket", { bucketName, error });
        return false;
      }
      logger.info("[SupabaseStorage] Bucket created", { bucketName });
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

/** Vacía un bucket eliminando todos sus archivos */
async function emptyBucket(bucketName: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  const files = await listBucketFilesRecursive(bucketName);
  if (files.length === 0) return true;
  return removeFromBucket(bucketName, files);
}

/** Elimina el bucket de un plan y todos sus archivos. No falla si el bucket no existe o Supabase no está configurado. */
export async function deletePlanBucket(destinationName: string): Promise<{ deleted: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { deleted: false, error: "Supabase no configurado" };
  }
  const bucketName = getPlanBucketName(destinationName);
  try {
    const { data: buckets } = await client.storage.listBuckets();
    const exists = buckets?.some((b) => b.name === bucketName);
    if (!exists) {
      logger.info("[SupabaseStorage] Bucket no existe, nada que eliminar", { bucketName });
      return { deleted: true };
    }
    const emptied = await emptyBucket(bucketName);
    if (!emptied) {
      return { deleted: false, error: "No se pudieron eliminar los archivos del bucket" };
    }
    const { error } = await client.storage.deleteBucket(bucketName);
    if (error) {
      logger.error("[SupabaseStorage] Error eliminando bucket", { bucketName, error: error.message });
      return { deleted: false, error: error.message };
    }
    logger.info("[SupabaseStorage] Bucket eliminado", { bucketName });
    return { deleted: true };
  } catch (err) {
    const msg = (err as Error).message;
    logger.error("[SupabaseStorage] deletePlanBucket error", { bucketName, err });
    return { deleted: false, error: msg };
  }
}

/** Reordena imágenes de un plan: descarga, elimina numeradas en bucket, sube en nuevo orden con nombres 1.ext, 2.ext, ... */
export async function reorderPlanImages(
  planName: string,
  imageUrls: string[]
): Promise<{ urls: string[]; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { urls: [], error: "Supabase no configurado" };

  const bucketName = getPlanBucketName(planName);
  const created = await ensureBucketExists(bucketName);
  if (!created) return { urls: [], error: "No se pudo acceder al bucket del plan" };

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
