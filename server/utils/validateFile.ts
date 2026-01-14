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
 * Validate file using magic bytes (file signature) to prevent MIME type spoofing
 */
export async function validateFile(
  buffer: Buffer,
  originalName: string,
  reportedMimeType: string
): Promise<FileValidationResult> {
  // Validate extension
  const ext = originalName.split('.').pop()?.toLowerCase();
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: "Invalid file extension. Only image files are allowed.",
    };
  }

  // Validate reported MIME type
  if (!ALLOWED_MIME_TYPES.includes(reportedMimeType)) {
    return {
      valid: false,
      error: "Invalid file type. Only images are allowed.",
    };
  }

  // Validate actual file type using magic bytes
  try {
    const fileType = await fileTypeFromBuffer(buffer);
    
    if (!fileType) {
      return {
        valid: false,
        error: "Unable to determine file type. File may be corrupted.",
      };
    }

    // Check if detected MIME type matches reported MIME type
    if (!ALLOWED_MIME_TYPES.includes(fileType.mime)) {
      return {
        valid: false,
        error: `File type mismatch. Detected: ${fileType.mime}, but expected image file.`,
      };
    }

    // Additional check: ensure extension matches detected type
    const detectedExt = fileType.ext;
    if (detectedExt !== ext && !(detectedExt === 'jpg' && ext === 'jpeg') && !(detectedExt === 'jpeg' && ext === 'jpg')) {
      return {
        valid: false,
        error: `File extension (${ext}) does not match actual file type (${detectedExt}).`,
      };
    }

    return {
      valid: true,
      mimeType: fileType.mime,
    };
  } catch (error) {
    return {
      valid: false,
      error: "Error validating file type.",
    };
  }
}
