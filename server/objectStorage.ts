import { Storage, File } from "@google-cloud/storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

// The object storage client is used to interact with the object storage service
export const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

// The object storage service is used to interact with the object storage service
export class ObjectStorageService {
  constructor() {}

  // Gets the private object directory
  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    if (!dir) {
      throw new Error(
        "PRIVATE_OBJECT_DIR not set. Create a bucket in 'Object Storage' " +
          "tool and set PRIVATE_OBJECT_DIR env var."
      );
    }
    return dir;
  }

  // Upload a file to object storage
  async uploadFile(filename: string, buffer: Buffer): Promise<string> {
    const privateObjectDir = this.getPrivateObjectDir();
    const objectId = randomUUID();
    const ext = filename.split('.').pop();
    const objectName = `${objectId}.${ext}`;
    const fullPath = `${privateObjectDir}/uploads/${objectName}`;

    const { bucketName, objectName: objectPath } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectPath);

    await file.save(buffer, {
      metadata: {
        contentType: getContentType(ext || ''),
      },
    });

    // Return just the filename for the URL
    return objectName;
  }

  // Download a file from object storage
  async downloadFile(filename: string): Promise<Buffer> {
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${filename}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const [buffer] = await file.download();
    return buffer;
  }

  // Stream a file from object storage to HTTP response
  async streamFile(filename: string, res: Response): Promise<void> {
    const privateObjectDir = this.getPrivateObjectDir();
    const fullPath = `${privateObjectDir}/uploads/${filename}`;

    const { bucketName, objectName } = parseObjectPath(fullPath);
    const bucket = objectStorageClient.bucket(bucketName);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      throw new ObjectNotFoundError();
    }

    const [metadata] = await file.getMetadata();
    
    res.set({
      'Content-Type': metadata.contentType || 'application/octet-stream',
      'Content-Length': metadata.size,
      'Cache-Control': 'private, max-age=31536000',
    });

    const stream = file.createReadStream();
    stream.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error streaming file' });
      }
    });

    stream.pipe(res);
  }
}

function parseObjectPath(path: string): {
  bucketName: string;
  objectName: string;
} {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }

  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");

  return {
    bucketName,
    objectName,
  };
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
