import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service using Replit's native client
export class ObjectStorageService {
  private client: Client;
  
  constructor() {
    // Initialize with default bucket
    const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
    this.client = bucketId ? new Client({ bucketId }) : new Client();
  }

  // Upload a file to object storage
  async uploadFile(filename: string, buffer: Buffer): Promise<string> {
    const objectId = randomUUID();
    const ext = filename.split('.').pop();
    const objectName = `uploads/${objectId}.${ext}`;

    const result = await this.client.uploadFromBytes(objectName, buffer);
    
    if (!result.ok) {
      console.error('[ObjectStorage] Upload failed:', result.error);
      throw new Error('Failed to upload to Object Storage');
    }

    // Return just the filename (without 'uploads/' prefix) for the URL
    return `${objectId}.${ext}`;
  }

  // Download a file from object storage as Buffer
  async downloadFile(filename: string): Promise<Buffer> {
    const objectName = `uploads/${filename}`;
    const result = await this.client.downloadAsBytes(objectName);
    
    if (!result.ok) {
      if (result.error?.message?.includes('not found') || result.error?.message?.includes('404')) {
        throw new ObjectNotFoundError();
      }
      console.error('[ObjectStorage] Download failed:', result.error);
      throw new Error('Failed to download from Object Storage');
    }

    // downloadAsBytes returns [Buffer] (array with one Buffer)
    return result.value[0];
  }

  // Stream a file from object storage to HTTP response
  async streamFile(filename: string, res: Response): Promise<void> {
    const objectName = `uploads/${filename}`;
    
    // downloadAsStream returns a Readable directly (not wrapped in Result)
    const stream = this.client.downloadAsStream(objectName);

    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const contentType = getContentType(ext);
    
    res.set({
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=31536000',
    });

    stream.on('error', (err: Error) => {
      console.error('[ObjectStorage] Stream error:', err);
      
      // Check if it's a "not found" error
      if (err.message?.includes('not found') || err.message?.includes('404')) {
        if (!res.headersSent) {
          res.status(404).json({ error: 'File not found' });
        }
        return;
      }
      
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    stream.pipe(res);
  }
}

function getContentType(ext: string): string {
  const contentTypes: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp'
  };
  return contentTypes[ext.toLowerCase()] || 'application/octet-stream';
}
