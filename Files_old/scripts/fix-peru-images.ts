
import { db } from "../server/db";
import { destinations, destinationImages } from "../shared/schema";
import { eq, and, like } from "drizzle-orm";
import fs from "fs";
import path from "path";

async function fixPeruImages() {
  console.log("Ajustando imágenes de portada para programas de Perú...");

  // Obtener todos los destinos de Perú
  const peruDestinations = await db.select().from(destinations).where(eq(destinations.country, "Perú"));

  for (const dest of peruDestinations) {
    // Obtener imágenes asociadas en la DB
    const images = await db.select().from(destinationImages)
      .where(eq(destinationImages.destinationId, dest.id))
      .orderBy(destinationImages.displayOrder);

    if (images.length === 0) {
      console.log(`[SKIP] ${dest.name} no tiene imágenes.`);
      continue;
    }

    // Seleccionar una imagen aleatoria para la portada (para asegurar variedad)
    // O usar una lógica específica si el usuario prefiere (ej: imagen 2, 3, etc.)
    // Aquí usaremos una lógica determinista basada en el nombre para que sea estable pero diferente
    
    let selectedImageIndex = 0;
    
    if (dest.name.includes("4 Días")) selectedImageIndex = 0; // 1.jpg
    else if (dest.name.includes("5 Días")) selectedImageIndex = 2; // 3.jpg
    else if (dest.name.includes("6 Días")) selectedImageIndex = 4; // 5.jpg
    else if (dest.name.includes("10 Días")) selectedImageIndex = 6; // 7.jpg
    else if (dest.name.includes("7 Días")) selectedImageIndex = 1; // 2.jpg
    else if (dest.name.includes("Lima y Cusco")) selectedImageIndex = 3; // 4.jpg
    
    // Asegurarse de que el índice existe
    if (selectedImageIndex >= images.length) {
      selectedImageIndex = 0;
    }

    const selectedImage = images[selectedImageIndex];
    
    console.log(`[UPDATE] ${dest.name} -> Usando imagen #${selectedImageIndex + 1}: ${selectedImage.imageUrl}`);

    await db.update(destinations)
      .set({ imageUrl: selectedImage.imageUrl })
      .where(eq(destinations.id, dest.id));
  }

  console.log("\nImágenes de portada actualizadas.");
  process.exit(0);
}

fixPeruImages();
