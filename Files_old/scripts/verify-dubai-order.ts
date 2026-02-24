import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { asc, eq } from "drizzle-orm";

async function verifyDubaiOrder() {
  console.log("Verificando orden de destinos de Dubai...\n");

  try {
    // Obtener todos los destinos activos ordenados
    const allDestinations = await db
      .select({
        name: destinations.name,
        displayOrder: destinations.displayOrder,
        isActive: destinations.isActive
      })
      .from(destinations)
      .orderBy(asc(destinations.displayOrder));

    console.log("📋 Orden de todos los destinos:\n");
    allDestinations.forEach((dest, index) => {
      const status = dest.isActive ? "✅" : "❌";
      console.log(`${status} [${dest.displayOrder}] ${dest.name}`);
    });

    // Verificar específicamente los destinos de Dubai
    console.log("\n🔍 Verificación de destinos Dubai:");
    const dubaiMaravilloso = allDestinations.find(d => d.name === "DUBAI Maravilloso");
    const dubaiEmiratos = allDestinations.find(d => d.name === "Dubai y Los Emiratos");

    if (dubaiMaravilloso) {
      console.log(`\n✅ Dubai Maravilloso:`);
      console.log(`   - Orden: ${dubaiMaravilloso.displayOrder}`);
      console.log(`   - Activo: ${dubaiMaravilloso.isActive}`);
    }

    if (dubaiEmiratos) {
      console.log(`\n✅ Dubai y Los Emiratos:`);
      console.log(`   - Orden: ${dubaiEmiratos.displayOrder}`);
      console.log(`   - Activo: ${dubaiEmiratos.isActive}`);
      
      if (dubaiMaravilloso && dubaiEmiratos.displayOrder === dubaiMaravilloso.displayOrder + 1) {
        console.log(`\n✅ ¡Orden correcto! Dubai y Los Emiratos (${dubaiEmiratos.displayOrder}) está justo después de Dubai Maravilloso (${dubaiMaravilloso.displayOrder})`);
      }
    }

  } catch (error) {
    console.error("Error:", error);
  }

  process.exit(0);
}

verifyDubaiOrder();
