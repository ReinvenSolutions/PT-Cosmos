
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedEspanaItaliaTuristica() {
  console.log("Iniciando carga del programa España e Italia Turística - Euro Express...");

  try {
    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "España e Italia Turística - Euro Express"),
            eq(destinations.country, "España, Francia, Italia")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "España e Italia Turística - Euro Express",
      description: "Un viaje de 11 días conectando las joyas del Mediterráneo. Comienza en Madrid y Barcelona, cruza la Costa Azul francesa, visita la icónica Torre de Pisa y explora las grandes ciudades italianas: Roma, Florencia, Venecia y Milán.",
      basePrice: "0",
      duration: 11,
      nights: 10,
      country: "España, Francia, Italia",
      imageUrl: "https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&q=80",
      isPromotion: false,
      category: "internacional",
      isActive: true
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "Santos Praga / Silken Puerta Madrid / 1881 Las Ventas",
        location: "Madrid",
        category: "Clásico (Turista/Primera)",
        nights: 2,
        destinationId: destination.id
      },
      {
        name: "Catalonia Sagrada Familia / Park Güell / Sabadell",
        location: "Barcelona",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "Ibis Cannes / Ibis Nice Promenade / Greet Hotel Nice",
        location: "Costa Azul (Niza/Cannes)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
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
        name: "Alexander Palace / Da Poppi / B&B Padova",
        location: "Venecia (Área)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "B&B Milano Ornato / Ibis Malpensa / B&B Malpensa",
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
        title: "Llegada a Madrid",
        description: "Llegada a Madrid y traslado al hotel. Tiempo libre. Opcional: Paseo nocturno con tapas (incluido en paquete Clásico-Vi).",
        activities: ["Traslado de llegada", "Paseo nocturno (Opcional)"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Madrid Panorámico",
        description: "Desayuno. Visita panorámica: Cibeles, Neptuno, Puerta del Sol, Gran Vía, Plaza de Toros, Paseo del Prado. Tarde libre. Opcional: Toledo. Opcional noche: Tablao Flamenco.",
        activities: ["Visita panorámica Madrid", "Toledo (Opcional)", "Tablao Flamenco (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Madrid - Zaragoza - Barcelona",
        description: "Desayuno. Salida hacia Zaragoza, visita a la Basílica del Pilar. Continuación a Barcelona. Visita panorámica: Plaza de España, Anillo Olímpico, Monumento a Colón, Barrio Gótico y exterior de la Sagrada Familia.",
        activities: ["Basílica del Pilar (Zaragoza)", "Visita panorámica Barcelona", "Barrio Gótico", "Sagrada Familia (Exterior)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Barcelona - Costa Azul",
        description: "Desayuno. Viaje a través de Francia (Languedoc y Provenza) hasta la Costa Azul. Tiempo libre. Opcional: Mónaco y Montecarlo.",
        activities: ["Viaje a Francia", "Mónaco y Montecarlo (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Costa Azul - Pisa - Roma",
        description: "Desayuno. Salida hacia Pisa (Italia). Tiempo libre en la Plaza de los Milagros (Torre Inclinada). Continuación hacia Roma. Alojamiento.",
        activities: ["Plaza de los Milagros (Pisa)", "Torre de Pisa"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Roma Imperial y Vaticano",
        description: "Desayuno. Opcional (o incluida en pack): Museos Vaticanos y Capilla Sixtina. Visita panorámica de Roma: Castel Sant'Angelo, Circo Máximo, etc. Opcional: Roma Antigua.",
        activities: ["Visita panorámica Roma", "Museos Vaticanos (Opcional)", "Roma Antigua (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 7,
        title: "Roma (Nápoles y Capri)",
        description: "Desayuno. Día libre. Opcional: Excursión de día completo a Nápoles y Capri (en invierno Pompeya y Nápoles).",
        activities: ["Día libre", "Nápoles y Capri (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 8,
        title: "Roma - Florencia",
        description: "Desayuno. Salida hacia Florencia. Visita panorámica: Duomo, Campanario, Baptisterio, Ponte Vecchio, Plaza de la Signoria. Tiempo libre u opcional Santa Croce.",
        activities: ["Visita panorámica Florencia", "Santa Croce (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 9,
        title: "Florencia - Venecia - Véneto",
        description: "Desayuno. Salida a Venecia. Paseo panorámico en barco. Visita a fábrica de cristal de Murano. Opcional: Paseo en Góndola. Traslado al hotel en la región del Véneto.",
        activities: ["Barco en Venecia", "Fábrica de cristal Murano", "Paseo en Góndola (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 10,
        title: "Véneto - Milán",
        description: "Desayuno. Salida hacia Milán. Tiempo libre para visitar el Duomo, la Galería Vittorio Emanuele y el Castello Sforzesco. Alojamiento.",
        activities: ["Visita Milán", "Duomo de Milán (Exterior)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 11,
        title: "Salida de Milán",
        description: "Desayuno. Tiempo libre hasta la hora del traslado al aeropuerto. Fin de servicios.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];

    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Visitas panorámicas con guía local: Madrid, Barcelona, Roma y Florencia",
      "Visitas comentadas por nuestro guía: Zaragoza, Costa Azul, Pisa, Venecia y Milán",
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

    console.log("¡Programa España e Italia Turística - Euro Express cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedEspanaItaliaTuristica();
