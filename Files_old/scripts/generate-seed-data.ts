
import { db } from '../server/db';
import { destinations, itineraryDays, hotels, inclusions, exclusions } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function generateSeedData() {
  const activeDestinations = await db.select().from(destinations).where(eq(destinations.isActive, true));
  
  console.log(`/**
 * DATOS CANÓNICOS DEL SISTEMA
 * 
 * Este archivo contiene la "fuente de verdad" de todos los destinos activos,
 * itinerarios, hoteles, inclusiones y exclusiones.
 * 
 * Estos datos se sincronizan automáticamente con la base de datos de producción
 * cada vez que se hace deploy.
 */

export const TURKEY_ESENCIAL_ID = 'a0edb8c2-7e77-444e-8221-2501fe87f338';
`);

  console.log('export const seedDestinations = [');
  for (const dest of activeDestinations) {
    console.log(`  {
    id: '${dest.id}',
    name: ${JSON.stringify(dest.name)},
    country: ${JSON.stringify(dest.country)},
    duration: ${dest.duration},
    nights: ${dest.nights},
    description: ${JSON.stringify(dest.description)},
    imageUrl: ${JSON.stringify(dest.imageUrl)},
    basePrice: '${dest.basePrice}',
    category: ${JSON.stringify(dest.category)},
    isPromotion: ${dest.isPromotion},
    displayOrder: ${dest.displayOrder},
    isActive: ${dest.isActive},
    requiresTuesday: ${dest.requiresTuesday},
  },`);
  }
  console.log('];\n');

  console.log('export const seedItineraryDays = [');
  for (const dest of activeDestinations) {
    const days = await db.select().from(itineraryDays).where(eq(itineraryDays.destinationId, dest.id)).orderBy(itineraryDays.dayNumber);
    for (const day of days) {
      console.log(`  { destinationId: '${dest.id}', dayNumber: ${day.dayNumber}, title: ${JSON.stringify(day.title)}, description: ${JSON.stringify(day.description)} },`);
    }
  }
  console.log('];\n');

  console.log('export const seedHotels = [');
  for (const dest of activeDestinations) {
    const hotelList = await db.select().from(hotels).where(eq(hotels.destinationId, dest.id));
    for (const hotel of hotelList) {
      console.log(`  { destinationId: '${dest.id}', name: ${JSON.stringify(hotel.name)}, category: ${JSON.stringify(hotel.category)}, location: ${JSON.stringify(hotel.location)} },`);
    }
  }
  console.log('];\n');

  console.log('export const seedInclusions = [');
  for (const dest of activeDestinations) {
    const incList = await db.select().from(inclusions).where(eq(inclusions.destinationId, dest.id));
    for (const inc of incList) {
      console.log(`  { destinationId: '${dest.id}', item: ${JSON.stringify(inc.item)}, displayOrder: ${inc.displayOrder} },`);
    }
  }
  console.log('];\n');

  console.log('export const seedExclusions = [');
  for (const dest of activeDestinations) {
    const excList = await db.select().from(exclusions).where(eq(exclusions.destinationId, dest.id));
    for (const exc of excList) {
      console.log(`  { destinationId: '${dest.id}', item: ${JSON.stringify(exc.item)}, displayOrder: ${exc.displayOrder} },`);
    }
  }
  console.log('];\n');
}

generateSeedData().catch(console.error);
