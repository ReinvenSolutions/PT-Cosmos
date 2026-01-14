import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq } from "drizzle-orm";

async function syncGranTourEuropa() {
  console.log("🔄 Sincronizando itinerario del Gran Tour de Europa...\n");

  try {
    // ID del destino existente en seed-data.ts
    const destinationId = 'e4ff361a-d04c-45b7-892f-a3dda97fc0bc';
    
    // Verificar que el destino existe
    const [destination] = await db
      .select()
      .from(destinations)
      .where(eq(destinations.id, destinationId));

    if (!destination) {
      console.log("❌ No se encontró el destino Gran Tour de Europa con ID:", destinationId);
      console.log("💡 Ejecuta primero el script de seed-data para crear el destino base");
      return;
    }

    console.log("✅ Destino encontrado:", destination.name);
    console.log("   ID:", destination.id);

    // Limpiar datos existentes del itinerario, hoteles, inclusiones y exclusiones
    console.log("\n🗑️  Limpiando datos anteriores...");
    await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, destinationId));
    await db.delete(hotels).where(eq(hotels.destinationId, destinationId));
    await db.delete(inclusions).where(eq(inclusions.destinationId, destinationId));
    await db.delete(exclusions).where(eq(exclusions.destinationId, destinationId));
    console.log("✅ Datos anteriores eliminados");

    // 1. Insertar Hoteles
    console.log("\n🏨 Insertando hoteles...");
    const hotelsData = [
      {
        name: "Santos Praga / Silken Puerta Madrid / 1881 Las Ventas",
        location: "Madrid",
        category: "Clásico (Turista/Primera)",
        nights: 3,
        destinationId: destinationId
      },
      {
        name: "Appart City Centre / Teneo Apparthotel / Campanile Le Lac",
        location: "Burdeos",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      },
      {
        name: "Ibis Nanterre / Ibis La Defense / B&B Nanterre",
        location: "París",
        category: "Clásico (Turista/Primera)",
        nights: 3,
        destinationId: destinationId
      },
      {
        name: "B&B Zurich East / B&B Zurich Airport / Ibis Messe Airport",
        location: "Zúrich",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      },
      {
        name: "Da Poppi / B&B Padova (Región del Véneto)",
        location: "Venecia (Área)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      },
      {
        name: "Ibis Firenze Nord / The Gate",
        location: "Florencia",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      },
      {
        name: "The Brand Roma / Black Hotel",
        location: "Roma",
        category: "Clásico (Turista/Primera)",
        nights: 3,
        destinationId: destinationId
      },
      {
        name: "Campanile Nice Aeropuerto / Isidore / Ibis Promenade",
        location: "Niza (Costa Azul)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      },
      {
        name: "Ibis Styles City Bogatell / Catalonia Barcelona 505 / Catalonia Atenas",
        location: "Barcelona",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destinationId
      }
    ];

    await db.insert(hotels).values(hotelsData);
    console.log(`✅ ${hotelsData.length} hoteles insertados`);

    // 2. Insertar Itinerario
    console.log("\n📅 Insertando itinerario...");
    const itineraryData = [
      {
        dayNumber: 1,
        title: "Llegada a Madrid",
        description: "Llegada a Madrid y traslado al hotel. Tiempo libre. Opcional: Paseo nocturno con degustación de tapas (incluida en paquete Clásico-Vi).",
        activities: ["Traslado de llegada", "Paseo nocturno (Opcional)"],
        meals: [],
        destinationId: destinationId
      },
      {
        dayNumber: 2,
        title: "Madrid Panorámico",
        description: "Desayuno. Visita panorámica: Cibeles, Neptuno, Puerta del Sol, Gran Vía, Plaza de Toros de las Ventas, Paseo del Prado. Tarde libre. Opcional: Excursión a Toledo. Opcional noche: Tablao Flamenco.",
        activities: ["Visita panorámica Madrid", "Toledo (Opcional)", "Tablao Flamenco (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 3,
        title: "Madrid - Burgos - Burdeos",
        description: "Desayuno. Salida hacia Burgos, tiempo libre para visitar su centro histórico y Catedral. Continuación hacia el País Vasco y Francia hasta llegar a Burdeos. Cena incluida.",
        activities: ["Visita Burgos", "Catedral de Burgos (Exterior)"],
        meals: ["Desayuno", "Cena"],
        destinationId: destinationId
      },
      {
        dayNumber: 4,
        title: "Burdeos - Blois - París",
        description: "Desayuno. Salida hacia el Valle del Loira. Parada en Blois (tiempo libre). Llegada a París. Opcional: Visita 'Iluminaciones de París'.",
        activities: ["Visita Blois", "Iluminaciones de París (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 5,
        title: "París Panorámico",
        description: "Desayuno. Visita panorámica con guía local: Campos Elíseos, Arco de Triunfo, Ópera, etc. Tarde libre. Opcional: Barco por el Sena y Barrio Latino.",
        activities: ["Visita panorámica París", "Crucero Sena (Opcional)", "Barrio Latino (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 6,
        title: "París (Versalles y Montmartre)",
        description: "Desayuno. Día libre. Opcional: Excursión al Palacio de Versalles. Opcional tarde: Visita a Montmartre y Basílica del Sagrado Corazón.",
        activities: ["Palacio de Versalles (Opcional)", "Montmartre (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 7,
        title: "París - Zúrich",
        description: "Desayuno. Salida hacia Suiza atravesando el centro de Francia. Llegada a Zúrich, capital financiera. Tiempo libre.",
        activities: ["Viaje a Suiza", "Tiempo libre en Zúrich"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 8,
        title: "Zúrich - Milán - Véneto",
        description: "Desayuno. Salida hacia Italia pasando por el Ticino suizo. Llegada a Milán, tiempo libre para ver el Duomo y Galería Vittorio Emanuele II. Continuación a la región del Véneto. Cena incluida.",
        activities: ["Visita Milán", "Duomo de Milán (Exterior)"],
        meals: ["Desayuno", "Cena"],
        destinationId: destinationId
      },
      {
        dayNumber: 9,
        title: "Venecia y Florencia",
        description: "Desayuno. Paseo panorámico en barco en Venecia. Visita a fábrica de cristal de Murano. Opcional: Gondolas. Salida en vaporetto y autobús hacia Florencia.",
        activities: ["Barco en Venecia", "Fábrica de cristal Murano", "Paseo en Góndola (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 10,
        title: "Florencia - Roma",
        description: "Desayuno. Visita panorámica de Florencia: Duomo, Ponte Vecchio, Plaza de la Signoria. Salida hacia Roma. Opcional: Roma Nocturna (Plazas y Fuentes).",
        activities: ["Visita panorámica Florencia", "Roma Nocturna (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 11,
        title: "Roma Imperial y Vaticano",
        description: "Desayuno. Opcional (o incluida en pack): Museos Vaticanos y Capilla Sixtina. Visita panorámica de Roma: Coliseo (exterior), Circo Máximo, etc. Opcional: Roma Antigua.",
        activities: ["Visita panorámica Roma", "Museos Vaticanos (Opcional)", "Roma Antigua (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 12,
        title: "Roma (Nápoles y Capri)",
        description: "Desayuno. Día libre. Opcional: Excursión de día completo a Nápoles y Capri (en invierno Pompeya y Nápoles).",
        activities: ["Día libre", "Nápoles y Capri (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 13,
        title: "Roma - Pisa - Costa Azul",
        description: "Desayuno. Salida hacia Pisa. Tiempo libre en la Plaza de los Milagros. Continuación a la Costa Azul. Opcional: Mónaco y Montecarlo.",
        activities: ["Plaza de los Milagros (Pisa)", "Mónaco y Montecarlo (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 14,
        title: "Costa Azul - Barcelona",
        description: "Desayuno. Viaje a través de la Provenza hacia España. Llegada a Barcelona. Visita panorámica: Plaza España, Montjuic, Puerto, Barrio Gótico y Sagrada Familia (exterior).",
        activities: ["Visita panorámica Barcelona", "Sagrada Familia (Exterior)"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 15,
        title: "Barcelona - Zaragoza - Madrid",
        description: "Desayuno. Salida hacia Zaragoza, visita a la Basílica del Pilar. Continuación a Madrid. Tiempo libre. Opcional: Paseo nocturno.",
        activities: ["Basílica del Pilar (Zaragoza)", "Traslado a Madrid"],
        meals: ["Desayuno"],
        destinationId: destinationId
      },
      {
        dayNumber: 16,
        title: "Salida de Madrid",
        description: "Desayuno. Tiempo libre hasta el traslado al aeropuerto. Fin de servicios.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destinationId
      }
    ];

    await db.insert(itineraryDays).values(itineraryData);
    console.log(`✅ ${itineraryData.length} días de itinerario insertados`);

    // 3. Insertar Inclusiones
    console.log("\n✅ Insertando inclusiones...");
    const inclusionsData = [
      "Visitas panorámicas con guía local en Madrid, París, Florencia, Roma y Barcelona",
      "Visitas comentadas por nuestro guía: Burgos, Burdeos, Blois, Zúrich, Milán, Venecia, Pisa, Costa Azul y Zaragoza",
      "Paseo panorámico en barco en Venecia y visita a fábrica de cristal de Murano",
      "2 comidas (Cenas en Burdeos y Véneto)",
      "Guía acompañante de habla hispana",
      "Traslados de llegada y salida",
      "Autocares modernos y servicio de audio individual",
      "Seguro de viaje y asistencia 24 horas",
      "Alojamiento en hoteles previstos (categoría turista/primera)"
    ].map(item => ({
      item: item,
      destinationId: destinationId
    }));

    await db.insert(inclusions).values(inclusionsData);
    console.log(`✅ ${inclusionsData.length} inclusiones insertadas`);

    // 4. Insertar Exclusiones
    console.log("\n❌ Insertando exclusiones...");
    const exclusionsData = [
      "Vuelos internacionales",
      "Tasas hoteleras (pago en destino)",
      "Propinas para guía y conductor",
      "Entradas a Museos Vaticanos (salvo si se compra el paquete opcional)",
      "Visado",
      "Maleteros",
      "Bebidas en las comidas"
    ].map(item => ({
      item: item,
      destinationId: destinationId
    }));

    await db.insert(exclusions).values(exclusionsData);
    console.log(`✅ ${exclusionsData.length} exclusiones insertadas`);

    // Eliminar el destino duplicado si existe
    console.log("\n🗑️  Eliminando destino duplicado si existe...");
    const duplicateId = '7f7b1902-dd9e-40d9-bf09-abbb53cc4143';
    await db.delete(itineraryDays).where(eq(itineraryDays.destinationId, duplicateId));
    await db.delete(hotels).where(eq(hotels.destinationId, duplicateId));
    await db.delete(inclusions).where(eq(inclusions.destinationId, duplicateId));
    await db.delete(exclusions).where(eq(exclusions.destinationId, duplicateId));
    await db.delete(destinations).where(eq(destinations.id, duplicateId));
    console.log("✅ Destino duplicado eliminado (si existía)");

    console.log("\n✅ ¡Sincronización completada exitosamente!");
    console.log(`\n📊 Resumen:`);
    console.log(`   - Hoteles: ${hotelsData.length}`);
    console.log(`   - Días de itinerario: ${itineraryData.length}`);
    console.log(`   - Inclusiones: ${inclusionsData.length}`);
    console.log(`   - Exclusiones: ${exclusionsData.length}`);
  } catch (error) {
    console.error("❌ Error al sincronizar el programa:", error);
  } finally {
    process.exit(0);
  }
}

syncGranTourEuropa();
