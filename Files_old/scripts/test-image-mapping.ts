import { getDestinationImageSet } from "../server/destination-images";

const colombiaDestinations = [
  { name: "Plan Amazonas 5 Días - 4 Noches 2025", country: "Colombia" },
  { name: "Aventura en Santander", country: "Colombia" },
  { name: "Guajira Cabo de la Vela y Punta Gallinas", country: "Colombia" },
  { name: "Capurganá", country: "Colombia" },
  { name: "Amazonas - Encuentro con la Selva", country: "Colombia" },
  { name: "Puebliando por Santander", country: "Colombia" },
];

console.log("🔍 Probando mapeo de imágenes de destinos nacionales...\n");

colombiaDestinations.forEach(dest => {
  const images = getDestinationImageSet(dest);
  console.log(`📍 ${dest.name}`);
  console.log(`   Imágenes encontradas: ${images.length}`);
  if (images.length > 0) {
    images.forEach((img, i) => console.log(`      ${i+1}. ${img}`));
  } else {
    console.log(`   ⚠️  No se encontraron imágenes`);
  }
  console.log();
});

console.log("✅ Prueba completada");
