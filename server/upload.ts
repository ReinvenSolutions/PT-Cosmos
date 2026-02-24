import type { Request, Response } from "express";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import {
  isSupabaseStorageEnabled,
  uploadToBucket,
  getPlanBucketName,
  getImagesBucketName,
  getMedicalAssistanceBucketName,
  getItineraryMapsBucketName,
  destinationNameToBucketSlug,
  parseSupabaseStorageUrl,
  downloadFromBucket,
} from "./supabaseStorage";
import { validateFile } from "./utils/validateFile";
import { logger } from "./logger";

// Determine storage mode: Supabase > local filesystem
let useSupabase = false;
let localUploadDir: string | null = null;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];

async function initializeStorage() {
  // 1. Supabase Storage (prioridad)
  if (isSupabaseStorageEnabled()) {
    useSupabase = true;
    logger.info("[Upload] Using Supabase Storage");
    return;
  }

  // 2. Fallback local filesystem
  localUploadDir = process.cwd() + "/uploads";
  if (!existsSync(localUploadDir)) {
    await mkdir(localUploadDir, { recursive: true });
  }
  logger.info("[Upload] Using local filesystem", { path: localUploadDir });
}

initializeStorage().catch((error) => {
  console.error("[Upload] Initialization error:", error);
});

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
    }

    const isAvatar = req.body?.avatar === "true" || req.body?.avatar === "1";
    const validation = await validateFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      isAvatar
    );

    if (!validation.valid) {
      logger.warn("File upload rejected", {
        reason: validation.error,
        filename: req.file.originalname,
        reportedMimeType: req.file.mimetype,
      });
      return res.status(400).json({ message: validation.error || "Invalid file type" });
    }

    const ext = validation.mimeType?.split("/")[1] || req.file.originalname.split(".").pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({
        message: "Invalid file extension. Only image files are allowed.",
      });
    }

    // Bucket y path: avatar → images/avatars, medical-assistance → medical-assistance, planName → plan-{slug}, default → images/flights
    const planName = req.body?.planName as string | undefined;
    const galleryIndex = req.body?.galleryIndex as string | undefined;
    const isMedicalAssistance = galleryIndex === "medical-assistance";
    const isItineraryMap = galleryIndex === "mapa-itinerario";

    let bucketName: string;
    let subPath: string;
    let filename: string;

    if (isMedicalAssistance) {
      bucketName = getMedicalAssistanceBucketName();
      subPath = "";
      filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
    } else if (isItineraryMap) {
      bucketName = getItineraryMapsBucketName();
      subPath = "";
      filename = `${Date.now()}-${randomBytes(8).toString("hex")}.${ext}`;
    } else if (isAvatar) {
      bucketName = getImagesBucketName();
      subPath = "avatars";
      filename = `${randomBytes(16).toString("hex")}.${ext}`;
    } else if (planName) {
      bucketName = getPlanBucketName(planName);
      subPath = "";
      const num = galleryIndex ? parseInt(galleryIndex, 10) : NaN;
      if (Number.isInteger(num) && num >= 1 && num <= 9999) {
        filename = `${num}.${ext}`;
      } else {
        filename = `${randomBytes(16).toString("hex")}.${ext}`;
      }
    } else {
      bucketName = getImagesBucketName();
      subPath = "flights";
      filename = `${randomBytes(16).toString("hex")}.${ext}`;
    }

    if ((planName || isMedicalAssistance || isItineraryMap) && !useSupabase) {
      logger.error("[Upload] Plan/medical-assistance images require Supabase Storage");
      return res.status(503).json({
        message: "La subida requiere Supabase Storage. Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.",
      });
    }

    if (useSupabase) {
      const storagePath = subPath ? `${subPath}/${filename}` : filename;

      let publicUrl: string | null = null;
      try {
        publicUrl = await uploadToBucket(
          bucketName,
          storagePath,
          req.file.buffer,
          req.file.mimetype
        );
      } catch (supabaseErr) {
        const msg = (supabaseErr as Error).message;
        return res.status(500).json({ message: msg || "Error al subir a Supabase Storage" });
      }
      if (!publicUrl) {
        return res.status(500).json({ message: "Error al subir a Supabase Storage" });
      }

      logger.info("[Upload] File uploaded to Supabase", {
        bucket: bucketName,
        path: storagePath,
        size: req.file.size,
        planName: planName || undefined,
      });
      return res.json({ url: publicUrl });
    }

    // Local filesystem
    if (!localUploadDir) {
      localUploadDir = process.cwd() + "/uploads";
      if (!existsSync(localUploadDir)) {
        await mkdir(localUploadDir, { recursive: true });
      }
    }

    const localFilename = planName && galleryIndex
      ? (() => {
          const num = parseInt(galleryIndex, 10);
          if (Number.isInteger(num) && num >= 1 && num <= 9999) {
            const slug = destinationNameToBucketSlug(planName);
            return `${slug}-${num}.${ext}`;
          }
          return `${randomBytes(16).toString("hex")}.${ext}`;
        })()
      : `${randomBytes(16).toString("hex")}.${ext}`;
    const filepath = join(localUploadDir, localFilename);
    await writeFile(filepath, req.file.buffer);
    logger.info("[Upload] File uploaded to local filesystem", {
      filename: localFilename,
      size: req.file.size,
    });
    return res.json({ url: `/api/images/${localFilename}` });
  } catch (error) {
    const err = error as Error;
    logger.error("File upload error", {
      error: err.message,
      filename: req.file?.originalname,
    });
    const msg = process.env.NODE_ENV === "development" ? err.message : "Error al subir el archivo. Intenta con otra imagen.";
    res.status(500).json({ message: msg });
  }
}

/** Obtiene el buffer de una imagen por filename (local) o por URL completa (Supabase) */
export async function getImageBuffer(filenameOrUrl: string): Promise<Buffer> {
  if (!filenameOrUrl || filenameOrUrl.includes("..")) {
    throw new Error("Invalid filename");
  }

  // URL remota (Supabase u otro CDN)
  if (filenameOrUrl.startsWith("https://")) {
    const parsed = parseSupabaseStorageUrl(filenameOrUrl);
    if (parsed) {
      const buffer = await downloadFromBucket(parsed.bucket, parsed.path);
      if (buffer) return buffer;
    }
    // Fallback: fetch directo
    const res = await fetch(filenameOrUrl);
    if (!res.ok) throw new Error("Image not found");
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Filename local (evitar path traversal)
  const filename = filenameOrUrl.includes("/") ? filenameOrUrl.split("/").pop()! : filenameOrUrl;
  if (!filename || filename.includes("..")) throw new Error("Invalid filename");

  if (localUploadDir) {
    const filepath = join(localUploadDir, filename);
    if (existsSync(filepath)) {
      return await readFile(filepath);
    }
  }

  throw new Error("File not found");
}

/** Devuelve path local para PDF o descarga y guarda temporalmente si es URL remota */
export async function getImagePathForPDF(filenameOrUrl: string): Promise<string> {
  if (filenameOrUrl.startsWith("https://")) {
    const tempDir = "/tmp/pdf-images";
    if (!existsSync(tempDir)) await mkdir(tempDir, { recursive: true });
    const safeName = filenameOrUrl.replace(/[^a-zA-Z0-9.-]/g, "_").slice(-80);
    const tempPath = join(tempDir, safeName);
    if (existsSync(tempPath)) return tempPath;
    const buffer = await getImageBuffer(filenameOrUrl);
    await writeFile(tempPath, buffer);
    return tempPath;
  }

  const filename = filenameOrUrl.includes("/") ? filenameOrUrl.split("/").pop()! : filenameOrUrl;

  const dir = localUploadDir || process.cwd() + "/uploads";
  return join(dir, filename);
}

export { destinationNameToBucketSlug, getPlanBucketName };
