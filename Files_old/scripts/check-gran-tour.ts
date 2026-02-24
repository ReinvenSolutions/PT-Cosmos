import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { like } from "drizzle-orm";

async function checkGranTour() {
  console.log("Verificando destinos de Europa en la base de datos...\n");

  try {
    // Buscar cualquier destino que contenga "Europa" o "Gran Tour"
    const allDestinations = await db.select().from(destinations);
    
    const europaDestinations = allDestinations.filter(d => 
      d.name.toLowerCase().includes('europa') || 
      d.name.toLowerCase().includes('gran tour')
    );
    
    console.log(`Total de destinos en la base de datos: ${allDestinations.length}`);
    console.log(`\nDestinos relacionados con Europa/Gran Tour: ${europaDestinations.length}`);
    
    if (europaDestinations.length > 0) {
      europaDestinations.forEach(d => {
        console.log(`\n📍 ${d.name}`);
        console.log(`   ID: ${d.id}`);
        console.log(`   País: ${d.country}`);
        console.log(`   Duración: ${d.duration} días / ${d.nights} noches`);
        console.log(`   Activo: ${d.isActive}`);
        console.log(`   Días permitidos: ${d.allowedDays || 'No especificado'}`);
      });
    } else {
      console.log("\n❌ No se encontraron destinos relacionados con Europa");
    }
    
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

checkGranTour()
  .then(() => {
    console.log("\n✨ Verificación completada");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
