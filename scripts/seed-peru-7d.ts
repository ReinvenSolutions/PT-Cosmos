import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "../shared/schema";
import { sql, eq, and } from "drizzle-orm";

async function seedPeru7D() {
  console.log("Iniciando carga del programa Perú 7D - 6N / Lima y Cusco...");

  try {
    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Perú 7D - 6N / Lima y Cusco"),
            eq(destinations.country, "Perú")
        )
    );

    // 1. Insertar el Destino Principal
    const [destination] = await db.insert(destinations).values({
      name: "Perú 7D - 6N / Lima y Cusco",
      country: "Perú",
      duration: 7,
      nights: 6,
      description: "Explora la riqueza cultural y natural de Perú en un viaje de 7 días. Desde la gastronomía y costas de Lima (Islas Ballestas y Huacachina) hasta el corazón del imperio Inca en Cusco, visitando Machu Picchu y la Montaña de 7 Colores. Incluye tren turístico y actividades de aventura.",
      basePrice: "0", // Precio a definir
      category: "internacional",
      isPromotion: true,
      requiresTuesday: false, // Salida fija específica
      imageUrl: "/assets/peru_cover.jpg", // Placeholder
      isActive: true
    }).returning();

    const destinationId = destination.id;
    console.log(`Destino creado con ID: ${destinationId}`);

    // 2. Insertar Hoteles
    await db.insert(hotels).values([
      { destinationId, name: "Hotel El Tambo 1 (Miraflores)", location: "Lima", category: "Turista Superior", nights: 3 },
      { destinationId, name: "Illa Hotel", location: "Cusco", category: "3 Estrellas", nights: 3 }
    ]);
    console.log("Hoteles insertados.");

    // 3. Insertar Itinerario
    await db.insert(itineraryDays).values([
      {
        destinationId,
        dayNumber: 1,
        title: "Llegada a Lima",
        location: "Lima",
        description: "Llegada a Lima. Recibimiento y traslado al hotel en la zona de Miraflores. Alojamiento.",
        activities: ["Traslado de llegada"],
        meals: [],
        accommodation: "Hotel El Tambo 1"
      },
      {
        destinationId,
        dayNumber: 2,
        title: "City Tour Lima Colonial y Moderna",
        location: "Lima",
        description: "Desayuno. Por la mañana (aprox. 08:50 AM), inicio del City Tour por Lima para recorrer sus principales atractivos. Retorno al hotel por la tarde.",
        activities: ["City Tour Lima"],
        meals: ["Desayuno"],
        accommodation: "Hotel El Tambo 1"
      },
      {
        destinationId,
        dayNumber: 3,
        title: "Paracas: Islas Ballestas y Oasis de Huacachina",
        location: "Lima",
        description: "Recojo temprano (05:00 AM). Salida hacia Paracas para el tour a Islas Ballestas. Visita a viñedo en Ica con degustación de piscos y vinos. Traslado al Oasis de Huacachina para paseo en Buggies tubulares y práctica de Sandboard en las dunas. Retorno a Lima por la noche (aprox. 10:00 PM).",
        activities: ["Islas Ballestas", "Viñedo en Ica", "Oasis de Huacachina", "Buggies y Sandboard"],
        meals: ["Desayuno"],
        accommodation: "Hotel El Tambo 1"
      },
      {
        destinationId,
        dayNumber: 4,
        title: "Vuelo a Cusco y City Tour Arqueológico",
        location: "Cusco",
        description: "Traslado al aeropuerto para vuelo a Cusco. Llegada y traslado al hotel. Por la tarde (02:00 PM), inicio del City Tour Arqueológico visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay. Fin del tour cerca de la Plaza de Armas.",
        activities: ["Traslado a aeropuertos", "City Tour Arqueológico", "Sacsayhuaman", "Tambo Machay"],
        meals: ["Desayuno"],
        accommodation: "Illa Hotel"
      },
      {
        destinationId,
        dayNumber: 5,
        title: "Machu Picchu: La Ciudad Perdida",
        location: "Cusco",
        description: "Recojo de madrugada y traslado a la estación. Tren hacia Aguas Calientes. Ascenso en bus a la ciudadela. Tour guiado en Machu Picchu. Descenso a Aguas Calientes y retorno en tren a Ollantaytambo con traslado final a Cusco.",
        activities: ["Tren a Machu Picchu", "Visita guiada Machu Picchu"],
        meals: ["Desayuno"],
        accommodation: "Illa Hotel"
      },
      {
        destinationId,
        dayNumber: 6,
        title: "Montaña de 7 Colores (Vinicunca)",
        location: "Cusco",
        description: "Recojo temprano (04:30 AM). Salida hacia Vinicunca. Caminata para apreciar la Montaña de 7 Colores. Incluye almuerzo. Retorno a Cusco finalizando cerca de la Plaza de Armas.",
        activities: ["Trek Montaña 7 Colores"],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Illa Hotel"
      },
      {
        destinationId,
        dayNumber: 7,
        title: "Despedida de Cusco",
        location: "Cusco",
        description: "Desayuno. A la hora indicada, partida hacia el aeropuerto para tomar su vuelo de regreso.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        accommodation: null
      }
    ]);
    console.log("Itinerario insertado.");

    // 4. Insertar Inclusiones
    await db.insert(inclusions).values([
      { destinationId, item: "Traslado Aeropuerto - Hotel - Aeropuerto en Lima y Cusco", displayOrder: 1 },
      { destinationId, item: "3 noches de alojamiento en Lima (Hotel El Tambo 1)", displayOrder: 2 },
      { destinationId, item: "3 noches de alojamiento en Cusco (Illa Hotel)", displayOrder: 3 },
      { destinationId, item: "Todos los desayunos (Box Breakfast para día Machu Picchu)", displayOrder: 4 },
      { destinationId, item: "City Tour en Lima", displayOrder: 5 },
      { destinationId, item: "Tour Islas Ballestas, Viñedos y Huacachina con Buggies + Sandboard", displayOrder: 6 },
      { destinationId, item: "City Tour Arqueológico en Cusco", displayOrder: 7 },
      { destinationId, item: "Tour a Machu Picchu (Ingreso, Bus subida/bajada, Guía)", displayOrder: 8 },
      { destinationId, item: "Ticket de Tren Voyager Expedition", displayOrder: 9 },
      { destinationId, item: "Tour a Vinicunca (Montaña 7 colores) con desayuno y almuerzo", displayOrder: 10 },
      { destinationId, item: "Boleto Turístico General (BTG)", displayOrder: 11 },
      { destinationId, item: "Guía profesional bilingüe y Bus turístico", displayOrder: 12 },
      { destinationId, item: "Seguro de viaje", displayOrder: 13 }
    ]);
    console.log("Inclusiones insertadas.");

    // 5. Insertar Exclusiones
    await db.insert(exclusions).values([
      { destinationId, item: "Gastos personales y propinas", displayOrder: 1 },
      { destinationId, item: "Almuerzos y Cenas (excepto el almuerzo mencionado en Vinicunca)", displayOrder: 2 },
      { destinationId, item: "Otros gastos no especificados", displayOrder: 3 }
    ]);
    console.log("Exclusiones insertadas.");

    console.log("¡Programa Perú 7D - 6N cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedPeru7D();
