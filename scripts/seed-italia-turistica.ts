
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedItaliaTuristica() {
  console.log("Iniciando carga del programa Italia Turística - Euro Express...");

  try {
    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Italia Turística - Euro Express"),
            eq(destinations.country, "Italia")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Italia Turística - Euro Express",
      description: "Recorrido esencial por Italia de 7 días. Inicia en Roma con visita panorámica, continúa hacia Florencia para descubrir el Renacimiento, Venecia con paseo en barco y finaliza en la moderna Milán. Una inmersión rápida y completa en la cultura italiana.",
      basePrice: "0",
      duration: 7,
      nights: 6,
      country: "Italia",
      imageUrl: "https://images.unsplash.com/photo-1529260830199-42c42dda5f3d?auto=format&fit=crop&q=80",
      isPromotion: false,
      category: "internacional",
      isActive: true
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "The Brand Roma / Black Hotel / Pineta Palace",
        location: "Roma",
        category: "Clásico (Turista/Primera)",
        nights: 3,
        destinationId: destination.id
      },
      {
        name: "Ibis Firenze Nord / The Gate Florencia",
        location: "Florencia",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "Alexander Palace Abano / Da Poppi / B&B Padova",
        location: "Venecia (Área)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "B&B Milano Ornato / Ibis Milano Malpensa / B&B Malpensa",
        location: "Milán",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      }
    ];

    await db.insert(hotels).values(hotelsData);
    console.log("Hoteles insertados");

    // 3. Insertar Itinerario
    const itineraryData = [
      {
        dayNumber: 1,
        title: "Llegada a Roma",
        description: "Llegada a Roma y traslado al hotel. Alojamiento.",
        activities: ["Traslado de llegada"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Roma Imperial y Vaticano",
        description: "Desayuno. Opcional (o incluida en pack): Museos Vaticanos, Capilla Sixtina y Basílica de San Pedro. Visita panorámica de Roma: Castel Sant'Angelo, Isla Tiberina, Circo Máximo, Termas de Caracalla, etc. Opcional: Roma Antigua.",
        activities: ["Visita panorámica Roma", "Museos Vaticanos (Opcional/Incluido según plan)", "Roma Antigua (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Roma (Nápoles y Capri)",
        description: "Desayuno. Día libre. Opcional: Excursión de día completo a Nápoles (panorámica) y Capri (barco, lancha y visita de la isla). En invierno se sustituye Capri por Pompeya.",
        activities: ["Día libre", "Nápoles y Capri (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Roma - Florencia",
        description: "Desayuno. Salida hacia Florencia. Visita panorámica: Duomo de Santa Maria del Fiore, Campanario de Giotto, Baptisterio, Ponte Vecchio y Plaza de la Signoria. Tiempo libre u opcional 'Santa Croce y Florencia Medieval'.",
        activities: ["Visita panorámica Florencia", "Santa Croce (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Florencia - Venecia - Véneto",
        description: "Desayuno. Salida hacia Venecia. Paseo panorámico en barco por la laguna. Visita a fábrica de cristal de Murano y Plaza San Marcos. Opcional: Paseo en Góndola. Traslado al hotel en la región del Véneto.",
        activities: ["Barco en Venecia", "Fábrica de cristal Murano", "Paseo en Góndola (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Véneto - Milán",
        description: "Desayuno. Salida hacia Milán. Tiempo libre para visitar el Castello Sforzesco, la Galería Vittorio Emanuele II y el Duomo. Alojamiento.",
        activities: ["Visita Milán", "Duomo de Milán (Exterior)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 7,
        title: "Salida de Milán",
        description: "Desayuno. Tiempo libre hasta la hora del traslado al aeropuerto para el vuelo de regreso. Fin de servicios.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];

    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Visitas panorámicas con guía local: Roma y Florencia",
      "Visitas comentadas por nuestro guía: Venecia y Milán",
      "Paseo panorámico en barco en Venecia",
      "Visita a fábrica de cristal de Murano",
      "Servicio de audio individual",
      "Guía acompañante de habla hispana",
      "Traslados de llegada y salida del aeropuerto principal",
      "Autocares modernos con medidas de seguridad",
      "Seguro de viaje",
      "Servicio de asistencia telefónica 24 horas",
      "Alojamiento en hoteles previstos (categoría turista/primera)"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));

    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      "Vuelos internacionales",
      "Tasas hoteleras (pago en destino)",
      "Propinas para guía y conductor",
      "Entradas a Museos Vaticanos (salvo si se compra el paquete opcional)",
      "Visado",
      "Maleteros",
      "Bebidas y comidas no especificadas"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));

    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Italia Turística - Euro Express cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedItaliaTuristica();
