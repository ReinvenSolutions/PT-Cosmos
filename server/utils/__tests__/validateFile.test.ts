import { describe, it, expect } from "vitest";
import { validateFile } from "../validateFile";

describe("File Validation", () => {
  // Create a valid JPEG buffer (minimal valid JPEG)
  const validJpegBuffer = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01
  ]);

  it("should validate a valid JPEG file", async () => {
    const result = await validateFile(
      validJpegBuffer,
      "test.jpg",
      "image/jpeg"
    );
    expect(result.valid).toBe(true);
    expect(result.mimeType).toBe("image/jpeg");
  });

  it("should reject invalid file extension", async () => {
    const result = await validateFile(
      validJpegBuffer,
      "test.exe",
      "image/jpeg"
    );
    expect(result.valid).toBe(false);
    expect(result.error).toContain("extension");
  });

  it("should reject invalid MIME type", async () => {
    const result = await validateFile(
      validJpegBuffer,
      "test.jpg",
      "application/pdf"
    );
    expect(result.valid).toBe(false);
  });
});
