import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkJanuaryDates() {
  console.log("Verificando fechas de enero 2026 para Turquía Esencial...\n");

  try {
    const turquia = await db.select().from(destinations).where(eq(destinations.name, "Turquía Esencial")).limit(1);
    
    if (turquia.length > 0 && turquia[0].priceTiers) {
      const januaryDates = turquia[0].priceTiers.filter(t => t.endDate.startsWith('2026-01'));
      
      console.log(`Fechas de enero 2026 (${januaryDates.length} fechas):\n`);
      
      januaryDates.slice(0, 10).forEach(tier => {
        const date = new Date(tier.endDate + 'T12:00:00'); // Usar mediodía para evitar problemas de zona horaria
        const dayOfWeek = date.getDay();
        const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const label = tier.isFlightDay ? "🛫 COL (Lunes)" : `$${tier.price} (Martes)`;
        
        console.log(`  ${tier.endDate} - ${dayNames[dayOfWeek]} - ${label}`);
      });
      
      // Verificar específicamente 6 y 7 de enero
      console.log("\n🔍 Verificación específica:");
      const jan6 = januaryDates.find(t => t.endDate === '2026-01-06');
      const jan7 = januaryDates.find(t => t.endDate === '2026-01-07');
      
      if (jan6) {
        const date6 = new Date('2026-01-06T12:00:00');
        console.log(`  6 de enero: ${date6.toLocaleDateString('es-ES', { weekday: 'long' })} - ${jan6.isFlightDay ? '🛫 COL' : '$710'}`);
      }
      
      if (jan7) {
        const date7 = new Date('2026-01-07T12:00:00');
        console.log(`  7 de enero: ${date7.toLocaleDateString('es-ES', { weekday: 'long' })} - ${jan7.isFlightDay ? '🛫 COL' : '$710'}`);
      }
    } else {
      console.log("❌ Turquía Esencial no encontrada o sin priceTiers");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

checkJanuaryDates();
