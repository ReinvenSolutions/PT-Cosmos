
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedCuscoHuacachina5D() {
  try {
    console.log("Iniciando carga del programa Tour Cusco Básico + Huacachina: 5 Días - 4 Noches...");

    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Tour Cusco Básico + Huacachina: 5 Días - 4 Noches"),
            eq(destinations.country, "Perú")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Tour Cusco Básico + Huacachina: 5 Días - 4 Noches",
      country: "Perú",
      duration: 5,
      nights: 4,
      description: "Recorrido de 5 días que combina la costa y los andes. Inicia en Lima con visita a las Islas Ballestas y el oasis de Huacachina (Buggies y Sandboard). Continúa en Cusco con el City Tour Arqueológico y la visita a la ciudadela de Machu Picchu. Precios válidos hasta el 30 de Noviembre del 2026",
      basePrice: "0",
      category: "internacional",
      isPromotion: false,
      imageUrl: "https://images.unsplash.com/photo-1531058240690-006c446962d8?auto=format&fit=crop&q=80", // Huacachina placeholder
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "Hotel El Tambo 1 (Miraflores)",
        location: "Lima",
        category: "3 Estrellas",
        nights: 2,
        destinationId: destination.id
      },
      {
        name: "Illa Hotel",
        location: "Cusco",
        category: "3 Estrellas",
        nights: 2,
        destinationId: destination.id
      }
    ];
    await db.insert(hotels).values(hotelsData);
    console.log("Hoteles insertados");

    // 3. Insertar Itinerario
    const itineraryData = [
      {
        dayNumber: 1,
        title: "Llegada a Lima",
        description: "Llegada a Lima y traslado al hotel (según hora de llegada de su vuelo).",
        activities: ["Traslado de llegada"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Islas Ballestas y Oasis de Huacachina",
        description: "Recojo 05:00 AM. Salida hacia Paracas para el tour a Islas Ballestas. Visita a viñedo en Ica (El Nieto o El Catador) para conocer el proceso de vinos y piscos. Traslado al Oasis de Huacachina para paseo en Buggies y Sandboarding. Retorno a Lima aprox. 10:00 PM.",
        activities: ["Islas Ballestas", "Viñedo en Ica", "Oasis de Huacachina", "Buggies y Sandboard"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Llegada a Cusco y City Tour Arqueológico",
        description: "Traslado al aeropuerto (6:45 AM). Vuelo a Cusco. Llegada y traslado al hotel. Por la tarde (2:00 PM), inicio del City Tour visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay. Fin del tour cerca de la Plaza de Armas.",
        activities: ["Traslado aeropuerto", "City Tour Arqueológico", "Sacsayhuaman", "Tambo Machay"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Tour a Machu Picchu",
        description: "Recojo 03:30 AM. Tren desde Ollantaytambo hacia Aguas Calientes. Tour a Machu Picchu (aprox. 09:30 AM). Retorno en tren a Ollantaytambo y traslado a Cusco, llegando a la Plaza San Francisco aprox. 07:30 PM.",
        activities: ["Tren a Machu Picchu", "Visita Machu Picchu"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Vuelo de Retorno",
        description: "Partida hacia el aeropuerto (hora recomendada 10:00 AM) para vuelo de retorno.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];
    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Traslado de Aeropuerto/hotel/Aeropuerto en Cusco",
      "2 noches de hospedaje en Cusco - Illa Hotel (3 estrellas)",
      "Todos los desayunos (Box Breakfast para día Machu Picchu)",
      "City tour Arqueológico en Cusco",
      "Tour a Machu Picchu",
      "Ticket de Tren Voyager o Expedition",
      "BTG (Boleto turístico general)",
      "Ticket Ingreso a Machu Picchu",
      "Boleto de bus de subida y bajada Aguas Calientes/Machupicchu",
      "Guía profesional bilingüe",
      "Bus turístico",
      "Tour a Islas Ballestas y Huacachina (Tubulares + Sandboard)",
      "City Tour en Lima",
      "Traslado de Aeropuerto/hotel/Aeropuerto en Lima",
      "2 noches de hospedaje en Lima - Hotel El Tambo 1"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      "Almuerzos",
      "Cenas",
      "Comisiones por transferencia de pago"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Tour Cusco Básico + Huacachina: 5 Días - 4 Noches cargado exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    process.exit(1);
  }
}

seedCuscoHuacachina5D();
