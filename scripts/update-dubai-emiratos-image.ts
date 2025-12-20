import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateDubaiEmiratesImage() {
  console.log("Actualizando imagen de portada de DUBAI Y LOS EMIRATOS...\n");

  try {
    // Cambiar de 1.jpg a 5.jpg para diferenciarlo de DUBAI Maravilloso
    const result = await db
      .update(destinations)
      .set({ imageUrl: "/images/destinations/dubai-maravilloso/5.jpg" })
      .where(eq(destinations.name, "DUBAI Y LOS EMIRATOS"))
      .returning();

    if (result.length > 0) {
      console.log("✅ Imagen actualizada:");
      console.log(`   Programa: ${result[0].name}`);
      console.log(`   Nueva imagen: ${result[0].imageUrl}`);
      console.log(`   (Antes usaba: /images/destinations/dubai-maravilloso/1.jpg)`);
    } else {
      console.log("❌ Programa no encontrado");
    }

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

updateDubaiEmiratesImage();
