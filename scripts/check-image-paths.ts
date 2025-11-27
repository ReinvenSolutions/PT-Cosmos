import { db } from "../server/db";
import { destinations, destinationImages } from "@shared/schema";
import { eq } from "drizzle-orm";

async function checkImagePaths() {
  const dest = await db.select().from(destinations).where(eq(destinations.name, 'Egipto (Con Crucero) + Emiratos: Salida Especial Mayo')).limit(1);

  if (dest.length > 0) {
    console.log('Destination:', dest[0].name);
    const images = await db.select().from(destinationImages).where(eq(destinationImages.destinationId, dest[0].id));
    console.log('Images:');
    console.log(JSON.stringify(images, null, 2));
  } else {
    console.log('Destination not found');
  }

  process.exit(0);
}

checkImagePaths();
