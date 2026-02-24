/**
 * Sube imágenes desde public/images/destinations a Supabase Storage
 *
 * Cada carpeta se convierte en un bucket plan-{carpeta} (ej: turquia-esencial → plan-turquia-esencial).
 * Actualiza destination_images y destinations.imageUrl en la BD con las nuevas URLs.
 *
 * USO:
 *   npx tsx scripts/upload-local-images-to-supabase.ts
 *
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { db } from "../server/db";
import { destinations, destinationImages } from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE_DIR = path.join(process.cwd(), "public", "images", "destinations");

const IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/** Mismo criterio que sanitizeFolderName en sync-images.ts */
function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureBucket(name: string): Promise<boolean> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === name)) return true;

  const { error } = await supabase.storage.createBucket(name, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });
  if (error) {
    console.error(`   ❌ Error creando bucket ${name}:`, error.message);
    return false;
  }
  console.log(`   📦 Bucket creado: ${name}`);
  return true;
}

async function main() {
  console.log("\n==========================================");
  console.log("🖼️  SUBIR IMÁGENES LOCALES → SUPABASE");
  console.log("==========================================\n");
  console.log(`Origen: ${BASE_DIR}\n`);

  if (!fs.existsSync(BASE_DIR)) {
    console.error("❌ No existe la carpeta public/images/destinations");
    process.exit(1);
  }

  const folders = fs.readdirSync(BASE_DIR).filter((f) => {
    const full = path.join(BASE_DIR, f);
    return fs.statSync(full).isDirectory() && !f.startsWith(".");
  });

  const allDestinations = await db.select().from(destinations);

  for (const folder of folders) {
    const bucketName = `plan-${folder}`;
    const folderPath = path.join(BASE_DIR, folder);

    const files = fs
      .readdirSync(folderPath)
      .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => {
        const na = parseInt(a.replace(/\D/g, ""), 10) || 0;
        const nb = parseInt(b.replace(/\D/g, ""), 10) || 0;
        return na - nb || a.localeCompare(b);
      });

    if (files.length === 0) {
      console.log(`⏭️  ${folder}: sin imágenes, omitido`);
      continue;
    }

    console.log(`\n📌 ${folder} (${files.length} imágenes)`);

    if (!(await ensureBucket(bucketName))) continue;

    const uploadedUrls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const filePath = path.join(folderPath, file);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(file).toLowerCase();
      const contentType =
        ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(file, buffer, { contentType, upsert: true });

      if (error) {
        console.log(`   ⚠️  Error subiendo ${file}:`, error.message);
        continue;
      }

      const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
      uploadedUrls.push(urlData.publicUrl);
      console.log(`   ✅ ${file}`);
    }

    if (uploadedUrls.length === 0) continue;

    // Buscar destinos que usan esta carpeta (slug del nombre coincide)
    const matchingDests = allDestinations.filter(
      (d) => slugFromName(d.name) === folder
    );

    for (const dest of matchingDests) {
      await db.delete(destinationImages).where(eq(destinationImages.destinationId, dest.id));

      for (let i = 0; i < uploadedUrls.length; i++) {
        await db.insert(destinationImages).values({
          destinationId: dest.id,
          imageUrl: uploadedUrls[i],
          displayOrder: i,
        });
      }

      await db
        .update(destinations)
        .set({ imageUrl: uploadedUrls[0] })
        .where(eq(destinations.id, dest.id));

      console.log(`   📝 BD actualizada para: ${dest.name}`);
    }

    if (matchingDests.length === 0) {
      console.log(`   ℹ️  Ningún destino en BD coincide con la carpeta (bucket listo para uso futuro)`);
    }
  }

  console.log("\n==========================================");
  console.log("✅ Proceso completado");
  console.log("==========================================\n");
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
