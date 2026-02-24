import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function renamePeruDestinations() {
  console.log("Renombrando destinos de Perú (eliminando duración del nombre)...\n");

  const destinationsToRename = [
    {
      oldName: "Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches",
      newName: "Tour Cusco Básico + Paracas - Huacachina - Nazca"
    },
    {
      oldName: "Lo Mejor de Cusco + Lima: 7 Días - 6 Noches",
      newName: "Lo Mejor de Cusco + Lima"
    },
    {
      oldName: "Tour Cusco Completo + Lima, Paracas, Nazca, Huacachina: 10 Días - 9 Noches",
      newName: "Tour Cusco Completo + Lima, Paracas, Nazca, Huacachina"
    },
    {
      oldName: "Tour Cusco Básico + Huacachina: 5 Días - 4 Noches",
      newName: "Tour Cusco Básico + Huacachina"
    },
    {
      oldName: "Lo Mejor de Cusco: 4 Días - 3 Noches",
      newName: "Lo Mejor de Cusco"
    }
  ];

  try {
    for (const dest of destinationsToRename) {
      const result = await db
        .update(destinations)
        .set({ name: dest.newName })
        .where(eq(destinations.name, dest.oldName))
        .returning();

      if (result.length > 0) {
        console.log(`✅ Renombrado: "${dest.oldName}"`);
        console.log(`   → "${dest.newName}"\n`);
      } else {
        console.log(`⚠️  No encontrado: "${dest.oldName}"\n`);
      }
    }

    console.log("Proceso completado.");
  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

renamePeruDestinations();
