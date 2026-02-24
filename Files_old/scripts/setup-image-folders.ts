
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import fs from "fs";
import path from "path";

function sanitizeFolderName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

async function setupImageFolders() {
  console.log("Iniciando creación de estructura de carpetas para imágenes...");

  const allDestinations = await db.select().from(destinations);
  const baseDir = path.join(process.cwd(), "uploads", "destinations");

  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
    console.log(`Creado directorio base: ${baseDir}`);
  }

  const folderMapping: Record<string, string> = {};

  for (const dest of allDestinations) {
    const folderName = sanitizeFolderName(dest.name);
    const folderPath = path.join(baseDir, folderName);

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
      console.log(`[NUEVA] Carpeta creada: ${folderName} (para: ${dest.name})`);
    } else {
      console.log(`[EXISTE] Carpeta ya existe: ${folderName}`);
    }
    
    folderMapping[dest.name] = folderName;
  }

  console.log("\nResumen de carpetas:");
  console.table(Object.entries(folderMapping).map(([name, folder]) => ({ Destino: name, Carpeta: folder })));
  
  console.log("\nEstructura lista. Por favor carga las imágenes en estas carpetas.");
  process.exit(0);
}

setupImageFolders();
