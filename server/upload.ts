import type { Request, Response } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";
import { existsSync } from "fs";

// Use /tmp/uploads as default. Object storage may not be mounted in development.
let UPLOAD_DIR = "/tmp/uploads";

// Try to use object storage if available, otherwise fall back to /tmp/uploads
async function getUploadDir(): Promise<string> {
  const objStorageDir = process.env.PRIVATE_OBJECT_DIR;
  
  if (objStorageDir && existsSync(objStorageDir)) {
    return objStorageDir;
  }
  
  // Ensure /tmp/uploads exists
  if (!existsSync(UPLOAD_DIR)) {
    await mkdir(UPLOAD_DIR, { recursive: true });
  }
  
  return UPLOAD_DIR;
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
    
    const url = `/uploads/${filename}`;
    
    res.json({ url });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
}
