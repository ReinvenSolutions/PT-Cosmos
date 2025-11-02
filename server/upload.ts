import type { Request, Response } from "express";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

// Determine storage mode
let useObjectStorage = false;
let localUploadDir: string | null = null;
let objectStorageService: ObjectStorageService | null = null;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

// Initialize storage on module load
async function initializeStorage() {
  try {
    // Try to initialize Object Storage
    objectStorageService = new ObjectStorageService();
    const privateDir = objectStorageService.getPrivateObjectDir();
    if (privateDir) {
      useObjectStorage = true;
      console.log('[Upload] Using Replit Object Storage');
      return;
    }
  } catch (error) {
    console.log('[Upload] Object Storage not available:', error);
  }

  // Fallback to local filesystem for development
  useObjectStorage = false;
  localUploadDir = '/home/runner/workspace/uploads';
  if (!existsSync(localUploadDir)) {
    await mkdir(localUploadDir, { recursive: true });
  }
  console.log('[Upload] Using local filesystem:', localUploadDir);
}

// Initialize on module load
initializeStorage().catch(console.error);

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    
    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ message: "Invalid file type. Only images are allowed." });
    }
    
    // Validate file extension
    const ext = req.file.originalname.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return res.status(400).json({ message: "Invalid file extension. Only image files are allowed." });
    }
    
    // Validate file size
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
    }
    
    let filename: string;
    
    if (useObjectStorage && objectStorageService) {
      // Upload to Object Storage
      try {
        filename = await objectStorageService.uploadFile(req.file.originalname, req.file.buffer);
        console.log('[Upload] File uploaded to Object Storage:', filename);
      } catch (error) {
        console.error('[Upload] Object Storage upload failed:', error);
        return res.status(500).json({ message: "Failed to upload to Object Storage" });
      }
    } else {
      // Upload to local filesystem
      if (!localUploadDir) {
        localUploadDir = '/home/runner/workspace/uploads';
        if (!existsSync(localUploadDir)) {
          await mkdir(localUploadDir, { recursive: true });
        }
      }
      
      filename = `${randomBytes(16).toString('hex')}.${ext}`;
      const filepath = join(localUploadDir, filename);
      await writeFile(filepath, req.file.buffer);
      console.log('[Upload] File uploaded to local filesystem:', filename);
    }
    
    // Return the URL to access the image
    const url = `/api/images/${filename}`;
    res.json({ url });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
}

// Get image buffer for serving
export async function getImageBuffer(filename: string): Promise<Buffer> {
  // Security: validate filename
  if (!filename || filename.includes("..") || filename.includes("/")) {
    throw new Error("Invalid filename");
  }
  
  if (useObjectStorage && objectStorageService) {
    // Download from Object Storage
    try {
      return await objectStorageService.downloadFile(filename);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        throw new Error("File not found");
      }
      console.error('[Upload] Failed to download from Object Storage:', error);
      throw error;
    }
  } else {
    // Read from local filesystem
    if (!localUploadDir) {
      localUploadDir = '/home/runner/workspace/uploads';
    }
    
    const filepath = join(localUploadDir, filename);
    if (!existsSync(filepath)) {
      throw new Error("File not found");
    }
    
    return await readFile(filepath);
  }
}

// Get image path for PDF generation
// For Object Storage, downloads to temp directory
// For local filesystem, returns direct path
export async function getImagePathForPDF(filename: string): Promise<string> {
  if (useObjectStorage && objectStorageService) {
    // For Object Storage, download to temp directory
    const tempDir = '/tmp/pdf-images';
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }
    
    const tempPath = join(tempDir, filename);
    
    // Check if already downloaded
    if (existsSync(tempPath)) {
      return tempPath;
    }
    
    // Download from Object Storage
    const buffer = await getImageBuffer(filename);
    await writeFile(tempPath, buffer);
    return tempPath;
  } else {
    // For local filesystem, return direct path
    if (!localUploadDir) {
      localUploadDir = '/home/runner/workspace/uploads';
    }
    return join(localUploadDir, filename);
  }
}
