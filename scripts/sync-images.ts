
import { db } from "../server/db";
import { destinations, destinationImages } from "../shared/schema";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function syncImages() {
  console.log("Sincronizando imágenes desde carpetas...");

  const allDestinations = await db.select().from(destinations);
  const baseDir = path.join(process.cwd(), "uploads", "destinations");

  for (const dest of allDestinations) {
    const folderName = sanitizeFolderName(dest.name);
    const folderPath = path.join(baseDir, folderName);

    if (!fs.existsSync(folderPath)) {
      console.log(`[SKIP] No existe carpeta para: ${dest.name}`);
      continue;
    }

    const files = fs.readdirSync(folderPath).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
    });

    if (files.length === 0) {
      console.log(`[EMPTY] Carpeta vacía para: ${dest.name}`);
      continue;
    }

    console.log(`[SYNC] Procesando ${files.length} imágenes para: ${dest.name}`);

    // Limpiar imágenes anteriores
    await db.delete(destinationImages).where(eq(destinationImages.destinationId, dest.id));

    // Insertar nuevas imágenes
    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      const publicPath = `/uploads/destinations/${folderName}/${fileName}`;

      await db.insert(destinationImages).values({
        destinationId: dest.id,
        imageUrl: publicPath,
        displayOrder: i,
      });

      // Si es la primera imagen, actualizar la imagen principal del destino
      if (i === 0) {
        await db.update(destinations)
          .set({ imageUrl: publicPath })
          .where(eq(destinations.id, dest.id));
      }
    }
  }

  console.log("\nSincronización completada.");
  process.exit(0);
}

syncImages();
