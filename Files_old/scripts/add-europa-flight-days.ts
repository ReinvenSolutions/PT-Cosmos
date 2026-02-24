import 'dotenv/config';
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function addFlightDays() {
  console.log("Agregando días de vuelo desde Colombia a planes de Europa...\n");

  try {
    // Italia Turística - Euro Express (viernes)
    const italia = await db.select().from(destinations).where(eq(destinations.name, "Italia Turística - Euro Express"));
    if (italia.length > 0 && italia[0].priceTiers) {
      const newTiers = [];
      // Solo procesar tiers que NO son días de vuelo
      const arrivalDays = italia[0].priceTiers.filter(tier => !tier.isFlightDay);
      
      for (const tier of arrivalDays) {
        // Agregar jueves previo como día de vuelo
        const friday = new Date(tier.endDate);
        const thursday = new Date(friday);
        thursday.setDate(thursday.getDate() - 1);
        const thursdayStr = thursday.toISOString().split('T')[0];
        
        newTiers.push({
          endDate: thursdayStr,
          price: tier.price,
          isFlightDay: true,
          flightLabel: "🛫 COL"
        });
        
        // Agregar viernes original con precio
        newTiers.push({
          endDate: tier.endDate,
          price: tier.price
        });
      }
      
      await db.update(destinations)
        .set({ priceTiers: newTiers })
        .where(eq(destinations.name, "Italia Turística - Euro Express"));
      
      console.log(`✅ Italia Turística: ${arrivalDays.length} viernes + ${arrivalDays.length} jueves de vuelo`);
    }

    // España e Italia Turística - Euro Express (domingo)
    const espana = await db.select().from(destinations).where(eq(destinations.name, "España e Italia Turística - Euro Express"));
    if (espana.length > 0 && espana[0].priceTiers) {
      const newTiers = [];
      // Solo procesar tiers que NO son días de vuelo
      const arrivalDays = espana[0].priceTiers.filter(tier => !tier.isFlightDay);
      
      for (const tier of arrivalDays) {
        // Agregar sábado previo como día de vuelo
        const sunday = new Date(tier.endDate);
        const saturday = new Date(sunday);
        saturday.setDate(saturday.getDate() - 1);
        const saturdayStr = saturday.toISOString().split('T')[0];
        
        newTiers.push({
          endDate: saturdayStr,
          price: tier.price,
          isFlightDay: true,
          flightLabel: "🛫 COL"
        });
        
        // Agregar domingo original con precio
        newTiers.push({
          endDate: tier.endDate,
          price: tier.price
        });
      }
      
      await db.update(destinations)
        .set({ priceTiers: newTiers })
        .where(eq(destinations.name, "España e Italia Turística - Euro Express"));
      
      console.log(`✅ España e Italia: ${arrivalDays.length} domingos + ${arrivalDays.length} sábados de vuelo`);
    }

    // Gran Tour de Europa (domingo)
    const granTour = await db.select().from(destinations).where(eq(destinations.name, "Gran Tour de Europa"));
    if (granTour.length > 0 && granTour[0].priceTiers) {
      const newTiers = [];
      // Solo procesar tiers que NO son días de vuelo
      const arrivalDays = granTour[0].priceTiers.filter(tier => !tier.isFlightDay);
      
      for (const tier of arrivalDays) {
        // Agregar sábado previo como día de vuelo
        const sunday = new Date(tier.endDate);
        const saturday = new Date(sunday);
        saturday.setDate(saturday.getDate() - 1);
        const saturdayStr = saturday.toISOString().split('T')[0];
        
        newTiers.push({
          endDate: saturdayStr,
          price: tier.price,
          isFlightDay: true,
          flightLabel: "🛫 COL"
        });
        
        // Agregar domingo original con precio
        newTiers.push({
          endDate: tier.endDate,
          price: tier.price
        });
      }
      
      await db.update(destinations)
        .set({ priceTiers: newTiers })
        .where(eq(destinations.name, "Gran Tour de Europa"));
      
      console.log(`✅ Gran Tour de Europa: ${arrivalDays.length} domingos + ${arrivalDays.length} sábados de vuelo`);
    }
    
  } catch (error) {
    console.error("Error:", error);
  }
  
  process.exit(0);
}

addFlightDays();
