
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedCuscoLima7Dv2() {
  try {
    console.log("Iniciando carga del programa Lo Mejor de Cusco + Lima: 7 Días - 6 Noches...");

    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Lo Mejor de Cusco + Lima: 7 Días - 6 Noches"),
            eq(destinations.country, "Perú")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Lo Mejor de Cusco + Lima: 7 Días - 6 Noches",
      country: "Perú",
      duration: 7,
      nights: 6,
      description: "Un viaje completo de una semana que integra la capital peruana y el corazón de los Andes. Incluye City Tour en Lima, aventura en Ica (Islas Ballestas y Huacachina), y lo mejor de Cusco: City Tour Arqueológico, la ciudadela de Machu Picchu y la Montaña de 7 Colores (Vinicunca). Precios válidos hasta el 30 de Noviembre del 2026",
      basePrice: "0",
      category: "internacional",
      isPromotion: false,
      imageUrl: "https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&q=80", // Machu Picchu placeholder
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "Hotel El Tambo 1 (Miraflores)",
        location: "Lima",
        category: "3 Estrellas",
        nights: 3,
        destinationId: destination.id
      },
      {
        name: "Illa Hotel",
        location: "Cusco",
        category: "3 Estrellas",
        nights: 3,
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
        description: "Llegada a Lima y traslado al hotel. Alojamiento.",
        activities: ["Traslado de llegada"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "City Tour Lima",
        description: "Recojo en el hotel (aprox. 08:50 AM). Inicio del City Tour por la ciudad. Fin del tour aprox. 01:30 PM.",
        activities: ["City Tour Lima"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Islas Ballestas y Oasis de Huacachina",
        description: "Recojo 05:00 AM. Salida a Paracas para tour a Islas Ballestas. Visita a viñedo en Ica (El Nieto o El Catador). Traslado al Oasis de Huacachina para paseo en Buggies y Sandboarding. Retorno a Lima (llegada aprox. 10:00 PM).",
        activities: ["Islas Ballestas", "Viñedo en Ica", "Oasis de Huacachina", "Buggies y Sandboard"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Llegada a Cusco y City Tour Arqueológico",
        description: "Traslado al aeropuerto en Lima (06:45 AM). Vuelo a Cusco. Llegada y traslado al hotel. Por la tarde (02:00 PM), inicio del City Tour Arqueológico visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay.",
        activities: ["Traslados aeropuerto", "City Tour Arqueológico", "Sacsayhuaman", "Tambo Machay"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Tour a Machu Picchu",
        description: "Recojo 03:30 AM. Tren desde Ollantaytambo hacia Aguas Calientes. Tour guiado en Machu Picchu (aprox. 09:30 AM). Retorno en tren a Ollantaytambo y traslado a Cusco, llegando aprox. 07:30 PM.",
        activities: ["Tren a Machu Picchu", "Visita guiada Machu Picchu"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Montaña de 7 Colores (Vinicunca)",
        description: "Recojo 04:30 AM. Inicio de caminata hacia Vinicunca. Almuerzo incluido. Retorno a Cusco, llegando aprox. 05:30 PM.",
        activities: ["Trek Montaña 7 Colores"],
        meals: ["Desayuno", "Almuerzo"],
        destinationId: destination.id
      },
      {
        dayNumber: 7,
        title: "Vuelo de Retorno",
        description: "Desayuno. A la hora indicada (aprox. 10:00 AM), partida hacia el aeropuerto para su vuelo de retorno.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];
    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Traslado de Aeropuerto/hotel/Aeropuerto en Lima y Cusco",
      "3 noches de hospedaje en Lima (Hotel El Tambo 1)",
      "3 noches de hospedaje en Cusco (Illa Hotel)",
      "Todos los desayunos (Box Breakfast para día Machu Picchu)",
      "City Tour en Lima",
      "Tour Islas Ballestas y Huacachina (Tubulares + Sandboard)",
      "City tour Arqueológico en Cusco",
      "Tour a Machu Picchu (Ingreso y Guía)",
      "Tour a Vinicunca (Montaña 7 colores) con desayuno y almuerzo",
      "Ticket de Tren Voyager o Expedition",
      "Boleto Turístico General (BTG)",
      "Boleto de bus Consetur subida y bajada",
      "Guía profesional bilingüe y Bus turístico"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      "Boletos aéreos Lima - Cusco - Lima",
      "Almuerzos (excepto en Vinicunca)",
      "Cenas",
      "Comisión por transferencia de dinero"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Lo Mejor de Cusco + Lima: 7 Días - 6 Noches cargado exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    process.exit(1);
  }
}

seedCuscoLima7Dv2();
