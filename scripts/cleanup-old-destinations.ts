
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { notInArray } from "drizzle-orm";

async function cleanupOldDestinations() {
  try {
    console.log("Iniciando limpieza de destinos antiguos...");

    const keepNames = [
      "Turquía Esencial",
      "Lisboa, España y Roma – Euro Express",
      "Egipto (Con Crucero) + Emiratos: Salida Especial Mayo",
      "Lo Mejor de Cusco: 4 Días - 3 Noches",
      "Tour Cusco Básico + Huacachina: 5 Días - 4 Noches",
      "Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches",
      "Lo Mejor de Cusco + Lima: 7 Días - 6 Noches",
      "Tour Cusco Completo + Lima, Paracas, Nazca, Huacachina: 10 Días - 9 Noches",
      "Auroras boreales finlandia",
      "Gran Tour de Europa",
      "Italia Turística - Euro Express",
      "España e Italia Turística - Euro Express",
      "Perú 7D - 6N / Lima y Cusco"
    ];

    console.log("Conservando los siguientes destinos:", keepNames);

    const deleted = await db.delete(destinations)
      .where(notInArray(destinations.name, keepNames))
      .returning({ name: destinations.name });

    console.log(`Se han eliminado ${deleted.length} destinos antiguos:`);
    deleted.forEach(d => console.log(` - ${d.name}`));

    console.log("¡Limpieza completada exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error durante la limpieza:", error);
    process.exit(1);
  }
}

cleanupOldDestinations();
