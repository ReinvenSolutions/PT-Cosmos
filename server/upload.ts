import type { Request, Response } from "express";
import { writeFile, mkdir, access } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";
import { constants } from "fs";

// Determine the correct upload directory based on environment
// In production: Use Object Storage (PRIVATE_OBJECT_DIR)
// In development: Use persistent workspace directory
let UPLOAD_DIR: string | null = null;

async function initializeUploadDir(): Promise<string> {
  if (UPLOAD_DIR) {
    return UPLOAD_DIR;
  }

  // Try to use Object Storage if PRIVATE_OBJECT_DIR is set and accessible
  const objectStorageDir = process.env.PRIVATE_OBJECT_DIR;
  
  if (objectStorageDir) {
    try {
      // Attempt to create or access the Object Storage directory
      if (!existsSync(objectStorageDir)) {
        await mkdir(objectStorageDir, { recursive: true });
      }
      
      // Verify write access
      await access(objectStorageDir, constants.W_OK);
      
      UPLOAD_DIR = objectStorageDir;
      console.log('[Upload] Using Object Storage directory:', UPLOAD_DIR);
      return UPLOAD_DIR;
    } catch (error) {
      console.log('[Upload] Object Storage not accessible:', error);
      console.log('[Upload] Falling back to local workspace directory');
    }
  }
  
  // Fallback to workspace directory for development
  UPLOAD_DIR = '/home/runner/workspace/uploads';
  
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  
  console.log('[Upload] Using local workspace directory:', UPLOAD_DIR);
  return UPLOAD_DIR;
}

async function getUploadDir(): Promise<string> {
  return await initializeUploadDir();
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

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
    
    // Validate file size (already handled by multer, but double-check)
    if (req.file.size > 10 * 1024 * 1024) {
      return res.status(400).json({ message: "File too large. Maximum size is 10MB." });
    }
    
    // Get upload directory (object storage or /tmp/uploads)
    const uploadDir = await getUploadDir();
    
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const filepath = join(uploadDir, filename);
    
    await writeFile(filepath, req.file.buffer);
    
    // Return the filename (not full path) to be used with /api/images/:filename endpoint
    const url = `/api/images/${filename}`;
    
    console.log('[Upload] File uploaded successfully:', { filename, url });
    res.json({ url });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
}

// Export function to get image path for PDF generation
// This must be synchronous for PDF generation, so we use the cached UPLOAD_DIR
export function getImagePath(filename: string): string {
  if (!UPLOAD_DIR) {
    // If not initialized yet, initialize synchronously using the fallback
    const objectStorageDir = process.env.PRIVATE_OBJECT_DIR;
    if (objectStorageDir && existsSync(objectStorageDir)) {
      return join(objectStorageDir, filename);
    }
    return join('/home/runner/workspace/uploads', filename);
  }
  return join(UPLOAD_DIR, filename);
}
