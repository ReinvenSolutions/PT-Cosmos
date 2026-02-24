/**
 * Utilidades para recortar imágenes con react-easy-crop
 */

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const isBlob = url.startsWith("blob:");
    if (!isBlob && (url.startsWith("http://") || url.startsWith("https://"))) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Error al cargar la imagen"));
    img.src = url;
  });
}

/**
 * Genera un Blob recortado para avatar. pixelCrop viene de react-easy-crop (croppedAreaPixels).
 */
export async function getCroppedAvatar(
  imageSrc: string,
  pixelCrop: Area,
  outputFormat: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("No hay contexto 2D disponible");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Error al generar la imagen recortada"));
        }
      },
      outputFormat,
      0.92
    );
  });
}
