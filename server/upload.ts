import type { Request, Response } from "express";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomBytes } from "crypto";

const PRIVATE_DIR = process.env.PRIVATE_OBJECT_DIR || "/tmp/uploads";

export async function handleFileUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    await mkdir(PRIVATE_DIR, { recursive: true });
    
    const ext = req.file.originalname.split('.').pop();
    const filename = `${randomBytes(16).toString('hex')}.${ext}`;
    const filepath = join(PRIVATE_DIR, filename);
    
    await writeFile(filepath, req.file.buffer);
    
    const url = `/uploads/${filename}`;
    
    res.json({ url });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ message: "Failed to upload file" });
  }
}
