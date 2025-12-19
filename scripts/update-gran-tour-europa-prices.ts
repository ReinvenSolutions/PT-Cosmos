import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function updateGranTourEuropaPrices() {
  console.log("Actualizando precios de Gran Tour de Europa con lógica de vuelos desde Colombia...\n");

  try {
    // Lunes con precios (llegada directa - 16 días)
    const mondayDates = [
      // Enero 2026
      { endDate: '2026-01-05', price: '2675.00' },
      { endDate: '2026-01-12', price: '2650.00' },
      { endDate: '2026-01-19', price: '2700.00' },
      { endDate: '2026-01-26', price: '2700.00' },
      
      // Febrero 2026
      { endDate: '2026-02-02', price: '2670.00' },
      { endDate: '2026-02-09', price: '2700.00' },
      { endDate: '2026-02-16', price: '2765.00' },
      { endDate: '2026-02-23', price: '2825.00' },
      
      // Marzo 2026
      { endDate: '2026-03-02', price: '2850.00' },
      { endDate: '2026-03-09', price: '2840.00' },
      { endDate: '2026-03-16', price: '2855.00' },
      { endDate: '2026-03-23', price: '2865.00' },
      { endDate: '2026-03-30', price: '2880.00' },
      
      // Abril 2026
      { endDate: '2026-04-06', price: '3675.00' },
      { endDate: '2026-04-13', price: '3675.00' },
      { endDate: '2026-04-20', price: '3700.00' },
      { endDate: '2026-04-27', price: '3720.00' },
      
      // Mayo 2026
      { endDate: '2026-05-04', price: '3835.00' },
      { endDate: '2026-05-11', price: '3975.00' },
      { endDate: '2026-05-18', price: '4000.00' },
      { endDate: '2026-05-25', price: '4280.00' },
      
      // Junio 2026
      { endDate: '2026-06-01', price: '3940.00' },
      { endDate: '2026-06-08', price: '3950.00' },
      { endDate: '2026-06-15', price: '3975.00' },
      { endDate: '2026-06-22', price: '4000.00' },
      { endDate: '2026-06-29', price: '3920.00' },
      
      // Julio 2026
      { endDate: '2026-07-06', price: '3685.00' },
      { endDate: '2026-07-13', price: '3615.00' },
      { endDate: '2026-07-20', price: '3640.00' },
      { endDate: '2026-07-27', price: '3615.00' },
      
      // Agosto 2026
      { endDate: '2026-08-03', price: '3615.00' },
      { endDate: '2026-08-10', price: '3575.00' },
      { endDate: '2026-08-17', price: '3590.00' },
      { endDate: '2026-08-24', price: '3715.00' },
      { endDate: '2026-08-31', price: '3800.00' },
      
      // Septiembre 2026
      { endDate: '2026-09-07', price: '3975.00' },
      { endDate: '2026-09-14', price: '3975.00' },
      { endDate: '2026-09-21', price: '4005.00' },
      { endDate: '2026-09-28', price: '4005.00' },
      
      // Octubre 2026
      { endDate: '2026-10-05', price: '4005.00' },
      { endDate: '2026-10-12', price: '3915.00' },
      { endDate: '2026-10-19', price: '3810.00' },
      { endDate: '2026-10-26', price: '3765.00' },
      
      // Noviembre 2026
      { endDate: '2026-11-02', price: '3445.00' },
      { endDate: '2026-11-09', price: '3340.00' },
      { endDate: '2026-11-16', price: '3340.00' },
      { endDate: '2026-11-23', price: '3295.00' },
      { endDate: '2026-11-30', price: '3295.00' },
      
      // Diciembre 2026
      { endDate: '2026-12-07', price: '3270.00' },
      { endDate: '2026-12-14', price: '3325.00' },
      { endDate: '2026-12-21', price: '3315.00' },
      { endDate: '2026-12-28', price: '3450.00' },
    ];
    
    // Generar domingos (día anterior) con marcador de vuelo desde Colombia
    const sundayDates = mondayDates.map(monday => {
      // Parse the date string correctly to avoid timezone issues
      const [yearStr, monthStr, dayStr] = monday.endDate.split('-');
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // JavaScript months are 0-indexed
      const day = parseInt(dayStr);
      
      // Create Monday date in local timezone
      const mondayDate = new Date(year, month, day);
      
      // Get Sunday (previous day)
      const sundayDate = new Date(mondayDate);
      sundayDate.setDate(sundayDate.getDate() - 1);
      
      const sundayYear = sundayDate.getFullYear();
      const sundayMonth = String(sundayDate.getMonth() + 1).padStart(2, '0');
      const sundayDay = String(sundayDate.getDate()).padStart(2, '0');
      
      return {
        endDate: `${sundayYear}-${sundayMonth}-${sundayDay}`,
        price: monday.price,
        isFlightDay: true,
        flightLabel: '🛫 COL'
      };
    });
    
    // Combinar domingos (vuelo COL) y lunes (llegada directa)
    const priceTiers = [...sundayDates, ...mondayDates];
    
    console.log(`Total de fechas: ${priceTiers.length} (${sundayDates.length} domingos con vuelo + ${mondayDates.length} lunes directos)\n`);
    
    // Mostrar resumen por mes
    const byMonth = mondayDates.reduce((acc, tier) => {
      const month = tier.endDate.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(tier);
      return acc;
    }, {} as Record<string, typeof priceTiers>);
    
    console.log("Resumen por mes:");
    Object.entries(byMonth).forEach(([month, dates]) => {
      const monthName = new Date(month + '-01').toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
      const avgPrice = dates.reduce((sum, d) => sum + parseFloat(d.price), 0) / dates.length;
      console.log(`  ${monthName}: ${dates.length} salidas, precio promedio: $${avgPrice.toFixed(2)}`);
    });
    
    console.log("\nLógica de vuelos:");
    console.log("  🛫 Domingos: Vuelo desde Colombia (17 días - incluye vuelo)");
    console.log("  📅 Lunes: Llegada directa (16 días estándar)\n");
    
    // Actualizar Gran Tour de Europa
    const result = await db
      .update(destinations)
      .set({ priceTiers })
      .where(eq(destinations.name, "Gran Tour de Europa"))
      .returning();
    
    if (result.length > 0) {
      console.log(`✅ Gran Tour de Europa actualizado con ${priceTiers.length} fechas (${sundayDates.length} domingos + ${mondayDates.length} lunes)`);
    } else {
      console.log("\n❌ No se encontró Gran Tour de Europa");
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

updateGranTourEuropaPrices();
