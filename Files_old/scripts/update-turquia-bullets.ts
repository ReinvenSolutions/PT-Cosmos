import { db } from '../server/db';
import { itineraryDays } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

async function updateTurquiaBullets() {
  console.log('Actualizando formato de bullets en Turquía Esencial...\n');

  const turkeyDestinationId = 'a0edb8c2-7e77-444e-8221-2501fe87f338';

  // Día 2
  const day2Description = `Desayuno en el hotel. Salida para una visita panorámica. Recorrido por una de las zonas más antiguas. Pasaremos por las murallas que rodean la ciudad, construidas en el siglo V y que han sido destruidas y reconstruidas cuatro veces. Durante todo el recorrido podrá disfrutar de la maravillosa vista del Bósforo. El recorrido continúa por Dolmabahce, el estadio Beeiktae, Taksim, Siehane y Eminonu. Nota: Los pasajeros que no adquieran la visita panorámica posterior opcional dispondrán de tiempo libre y regresarán al hotel por su cuenta.

**(ACTIVIDAD INCLUIDA SI TU PLAN INCLUYE MEJORA.)**
**Tour Opcional - Bósforo con almuerzo**

• Barrio de Balat (y Fener): Exploración de la zona exterior occidental de Estambul Es un área histórica, lejos de las rutas turísticas típicas, conocida por sus casas otomanas coloridas y cultura local
• Mezquita Süleymaniye: Visita a la mezquita construida por Mimar Sinan (1551-1557) en honor a Solimán el Magnífico
• Almuerzo: Parada en un restaurante local
• Crucero por el Bósforo: Viaje en transbordadores regulares navegando entre Asia y Europa
• Vistas: Palacios otomanos a las orillas, la plaza y cafés de Ortaköy, la mezquita de Mecidiye y los puentes colgantes intercontinentales
• Bazar Egipcio (Bazar de las Especias): Visita al segundo bazar más grande y antiguo de la ciudad para comprar especias, frutos secos, dulces, té y caviar
• Cierre: Llegada al hotel y alojamiento`;

  // Día 9
  const day9Description = `Desayuno en el hotel. Día libre.

**(ACTIVIDAD INCLUIDA SI TU PLAN INCLUYE MEJORA.)**
**Tour Opcional: Estambul Clásico con almuerzo**

• Palacio de Topkapı: Vista panorámica (sin entrada al palacio). Lugar de residencia de los sultanes otomanos
• Basílica de Santa Sofía: Visita a este monumento que posee la cúpula más grande del mundo cristiano por 900 años. Ha servido como iglesia, museo y actualmente es una mezquita
• Mezquita Azul: La más visitada de la ciudad. Famosa por su colección de azulejos de Iznik y por ser una réplica de Santa Sofía ordenada por el sultán Ahmet
• Gran Bazar: Parada final para realizar compras
• Cierre: Alojamiento`;

  // Actualizar día 2
  await db.update(itineraryDays)
    .set({ description: day2Description })
    .where(
      and(
        eq(itineraryDays.destinationId, turkeyDestinationId),
        eq(itineraryDays.dayNumber, 2)
      )
    );
  
  console.log('✓ Día 2 actualizado');

  // Actualizar día 9
  await db.update(itineraryDays)
    .set({ description: day9Description })
    .where(
      and(
        eq(itineraryDays.destinationId, turkeyDestinationId),
        eq(itineraryDays.dayNumber, 9)
      )
    );
  
  console.log('✓ Día 9 actualizado');
  console.log('\n¡Actualización completada!');

  process.exit(0);
}

updateTurquiaBullets().catch(console.error);
