import 'dotenv/config';
import { db } from "../server/db";
import { destinations, destinationImages } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function addPeruImages() {
  console.log("Agregando imágenes a los destinos de Perú...\n");

  const peruDestinations = [
    {
      name: "Lo Mejor de Cusco",
      images: [1, 2, 3, 4, 5, 6].map(n => 
        `/images/destinations/lo-mejor-de-cusco-4-dias-3-noches/${n}.jpg`
      )
    },
    {
      name: "Tour Cusco Básico + Huacachina",
      images: [1, 2, 3, 4, 5, 6].map(n => 
        `/images/destinations/tour-cusco-basico-huacachina-5-dias-4-noches/${n}.jpg`
      )
    },
    {
      name: "Tour Cusco Básico + Paracas - Huacachina - Nazca",
      images: [1, 2, 3, 4, 5, 6].map(n => 
        `/images/destinations/tour-cusco-basico-paracas-huacachina-nazca-6-dias-5-noches/${n}.jpg`
      )
    },
    {
      name: "Lo Mejor de Cusco + Lima",
      images: [5, 6, 7, 8, 9, 10, 11].map(n => 
        `/images/destinations/lo-mejor-de-cusco-lima-7-dias-6-noches/${n}.jpg`
      )
    },
    {
      name: "Tour Cusco Completo + Lima, Paracas, Nazca, Huacachina",
      images: [5, 6, 7, 8, 9, 10, 11].map(n => 
        `/images/destinations/tour-cusco-completo-lima-paracas-nazca-huacachina-10-dias-9-noches/${n}.jpg`
      )
    }
  ];

  try {
    for (const destData of peruDestinations) {
      // Buscar el destino
      const [destination] = await db
        .select()
        .from(destinations)
        .where(
          and(
            eq(destinations.name, destData.name),
            eq(destinations.country, "Perú")
          )
        )
        .limit(1);

      if (!destination) {
        console.log(`⚠️  Destino no encontrado: "${destData.name}"`);
        continue;
      }

      // Eliminar imágenes existentes
      await db
        .delete(destinationImages)
        .where(eq(destinationImages.destinationId, destination.id));

      // Insertar nuevas imágenes
      for (let i = 0; i < destData.images.length; i++) {
        await db.insert(destinationImages).values({
          destinationId: destination.id,
          imageUrl: destData.images[i],
          displayOrder: i + 1,
        });
      }

      console.log(`✅ ${destData.name}: ${destData.images.length} imágenes agregadas`);
    }

    console.log("\n✅ Proceso completado.");
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

addPeruImages();
