/**
 * Sube las imágenes de Turquía desde attached_assets al bucket plan-turquia-esencial en Supabase.
 *
 * Archivos que sube:
 * - mapa itinerario turquia_1763577662908.png → mapa-itinerario.png
 * - 1_1763570259884.png ... 6_1763570259885.png → 1.png ... 6.png
 *
 * USO:
 *   npx tsx scripts/upload-turquia-assets-to-supabase.ts
 *
 * Requiere: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ASSETS_DIR = path.join(process.cwd(), "attached_assets");
const BUCKET = "plan-turquia-esencial";

const MAPA_SOURCE = "mapa itinerario turquia_1763577662908.png";
const IMAGES_SOURCE = [
  "1_1763570259884.png",
  "2_1763570259884.png",
  "3_1763570259885.png",
  "4_1763570259885.png",
  "5_1763570259885.png",
  "6_1763570259885.png",
];

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function ensureBucket(): Promise<boolean> {
  const { data: buckets } = await supabase.storage.listBuckets();
  if (buckets?.some((b) => b.name === BUCKET)) return true;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  });
  if (error) {
    console.error(`❌ Error creando bucket ${BUCKET}:`, error.message);
    return false;
  }
  console.log(`📦 Bucket creado: ${BUCKET}`);
  return true;
}

async function main() {
  console.log("\n==========================================");
  console.log("🖼️  SUBIR IMÁGENES TURQUÍA (attached_assets → Supabase)");
  console.log("==========================================\n");

  if (!fs.existsSync(ASSETS_DIR)) {
    console.error("❌ No existe la carpeta attached_assets");
    process.exit(1);
  }

  if (!(await ensureBucket())) process.exit(1);

  // 1. Mapa
  const mapaPath = path.join(ASSETS_DIR, MAPA_SOURCE);
  if (fs.existsSync(mapaPath)) {
    const buffer = fs.readFileSync(mapaPath);
    const { error } = await supabase.storage.from(BUCKET).upload("mapa-itinerario.png", buffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (error) {
      console.error("❌ Error subiendo mapa:", error.message);
    } else {
      console.log("✅ mapa-itinerario.png");
    }
  } else {
    console.warn(`⚠️  No encontrado: ${MAPA_SOURCE}`);
  }

  // 2. Imágenes 1–6
  for (let i = 0; i < IMAGES_SOURCE.length; i++) {
    const src = IMAGES_SOURCE[i];
    const dest = `${i + 1}.png`;
    const filePath = path.join(ASSETS_DIR, src);

    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️  No encontrado: ${src}`);
      continue;
    }

    const buffer = fs.readFileSync(filePath);
    const { error } = await supabase.storage.from(BUCKET).upload(dest, buffer, {
      contentType: "image/png",
      upsert: true,
    });

    if (error) {
      console.error(`❌ Error subiendo ${dest}:`, error.message);
    } else {
      console.log(`✅ ${dest}`);
    }
  }

  console.log("\n==========================================");
  console.log("✅ Proceso completado");
  console.log(`   Bucket: ${BUCKET}`);
  console.log("==========================================\n");
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
