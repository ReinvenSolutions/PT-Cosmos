import 'dotenv/config';
import { db } from "../server/db";
import { destinationImages, destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

const colombiaDestIds = [
  'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
  'b2c3d4e5-6f7a-8b9c-0d1e-2f3a4b5c6d7e',
  'c3d4e5f6-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
  'd4e5f6a7-8b9c-0d1e-2f3a-4b5c6d7e8f9a',
  'c9e52466-d6d7-41ea-b3e5-5e50ede054e6',
  'f097b3de-2a0b-450d-9360-0528ede74de2'
];

async function checkImages() {
  console.log("🔍 Verificando imágenes en BD para destinos nacionales...\n");
  
  for (const id of colombiaDestIds) {
    const [dest] = await db.select().from(destinations).where(eq(destinations.id, id));
    const images = await db.select().from(destinationImages).where(eq(destinationImages.destinationId, id));
    
    if (dest) {
      console.log(`📍 ${dest.name}`);
      console.log(`   Imágenes en BD: ${images.length}`);
      if (images.length > 0) {
        images.forEach((img, i) => console.log(`      ${i+1}. ${img.imageUrl}`));
      } else {
        console.log(`   ⚠️  No hay imágenes en la BD - usará fallback`);
      }
      console.log();
    }
  }
  
  process.exit(0);
}

checkImages();
