import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

/**
 * Validate file using magic bytes (file signature) to prevent MIME type spoofing.
 * @param relaxForAvatar - If true, be more lenient (skip extension match, accept any detected image)
 */
export async function validateFile(
  buffer: Buffer,
  originalName: string,
  reportedMimeType: string,
  relaxForAvatar = false
): Promise<FileValidationResult> {
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: "Extensión no válida. Usa JPG, PNG, GIF o WebP.",
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(reportedMimeType)) {
    return {
      valid: false,
      error: "Tipo de archivo no válido. Solo imágenes.",
    };
  }

  try {
    const fileType = await fileTypeFromBuffer(buffer);

    if (!fileType) {
      if (relaxForAvatar && buffer.length > 0 && buffer.length < 15 * 1024 * 1024) {
        // Para avatar: si magic bytes fallan pero es pequeño y el tipo reportado es imagen, permitir
        return { valid: true, mimeType: reportedMimeType };
      }
      return {
        valid: false,
        error: "No se pudo verificar el tipo de archivo. Prueba con otra imagen.",
      };
    }

    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return {
        valid: false,
        error: `Tipo detectado: ${fileType.mime}. Solo JPEG, PNG, GIF o WebP.`,
      };
    }

    const detectedExt = fileType.ext;
    const extMatch = detectedExt === ext || (detectedExt === 'jpg' && ext === 'jpeg') || (detectedExt === 'jpeg' && ext === 'jpg');
    if (!extMatch && !relaxForAvatar) {
      return {
        valid: false,
        error: `Extensión (.${ext}) no coincide con el archivo real (.${detectedExt}).`,
      };
    }

    return {
      valid: true,
      mimeType: fileType.mime,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Error al validar el archivo.",
    };
  }
}

const PLAN_AUDIO_MAX_BYTES_DEFAULT = 40 * 1024 * 1024;

/** Valida MP3 por firma (magic bytes) para audio descriptivo del plan. */
export async function validatePlanDescriptiveAudio(
  buffer: Buffer,
  originalName: string,
  reportedMimeType: string,
  maxBytes: number = PLAN_AUDIO_MAX_BYTES_DEFAULT,
): Promise<FileValidationResult> {
  if (buffer.length > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, error: `El archivo supera el tamaño máximo (${mb} MB).` };
  }

  const ext = originalName.split(".").pop()?.toLowerCase();
  if (ext !== "mp3") {
    return { valid: false, error: "Extensión no válida. Usa un archivo .mp3." };
  }

  const okReported =
    reportedMimeType === "audio/mpeg" ||
    reportedMimeType === "audio/mp3" ||
    reportedMimeType === "application/octet-stream";
  if (!okReported) {
    return {
      valid: false,
      error: "Tipo MIME no reconocido para MP3. Prueba desde otro navegador o re-exporta el audio.",
    };
  }

  try {
    const fileType = await fileTypeFromBuffer(buffer);
    if (!fileType) {
      return {
        valid: false,
        error: "No se pudo verificar el audio. Asegúrate de que sea un MP3 válido.",
      };
    }
    const detectedMime = String(fileType.mime);
    if (detectedMime !== "audio/mpeg" && detectedMime !== "audio/mp3") {
      return {
        valid: false,
        error: `Tipo detectado: ${detectedMime}. Solo se permiten archivos MP3.`,
      };
    }
    return { valid: true, mimeType: "audio/mpeg" };
  } catch {
    return { valid: false, error: "Error al validar el audio." };
  }
}
