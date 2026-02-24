
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedCuscoNazca6D() {
  try {
    console.log("Iniciando carga del programa Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches...");

    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches"),
            eq(destinations.country, "Perú")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches",
      country: "Perú",
      duration: 6,
      nights: 5,
      description: "Circuito completo de 6 días combinando la costa y los andes. Incluye Lima, Islas Ballestas, Oasis de Huacachina con Buggies, pernocte en Nazca con Sobrevuelo a las Líneas, y finaliza en Cusco con City Tour y Machu Picchu. Precios válidos hasta el 30 de Noviembre del 2026",
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
        nights: 2,
        destinationId: destination.id
      },
      {
        name: "Casa Hacienda Nazca",
        location: "Nazca",
        category: "Hacienda / Turista",
        nights: 1,
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
        description: "Llegada a Lima y traslado al hotel según la hora de llegada de su vuelo.",
        activities: ["Traslado de llegada"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Paracas, Huacachina y Traslado a Nazca",
        description: "Recojo de madrugada (04:50 AM). Salida a Paracas. Tour marítimo a Islas Ballestas. Traslado a Ica para visita a viñedo. Visita al Oasis de Huacachina con paseo en Buggies y Sandboarding. Traslado a Nazca en movilidad compartida. Llegada y traslado al hotel.",
        activities: ["Islas Ballestas", "Viñedo en Ica", "Oasis de Huacachina", "Buggies y Sandboard", "Traslado a Nazca"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Sobrevuelo Líneas de Nazca y Retorno a Lima",
        description: "Desayuno. Sobrevuelo a las Líneas de Nazca (observación de 12 geoglifos). Traslado a la estación de bus. Viaje en bus Cruz del Sur hacia Lima (12:30 PM). Llegada a Lima (aprox 08:30 PM) y traslado al hotel.",
        activities: ["Sobrevuelo Líneas de Nazca", "Bus Nazca - Lima"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Llegada a Cusco y City Tour Arqueológico",
        description: "Traslado al aeropuerto en Lima. Vuelo a Cusco (no incluido). Llegada y traslado al hotel. Por la tarde (02:00 PM), inicio del City Tour Arqueológico visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay.",
        activities: ["Traslados aeropuerto", "City Tour Arqueológico", "Sacsayhuaman", "Tambo Machay"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Tour a Machu Picchu",
        description: "Recojo 03:30 AM. Tren desde Ollantaytambo hacia Aguas Calientes. Tour guiado en Machu Picchu (aprox 09:30 AM). Retorno en tren a Ollantaytambo y traslado a Cusco, llegando aprox 07:30 PM.",
        activities: ["Tren a Machu Picchu", "Visita guiada Machu Picchu"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Vuelo de Retorno",
        description: "Desayuno. A la hora indicada (aprox 10:00 AM), partida hacia el aeropuerto para su vuelo de retorno.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];
    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Traslados Aeropuerto/hotel/Aeropuerto en Lima y Cusco",
      "2 noches de hospedaje en Lima (Hotel El Tambo 1)",
      "1 noche de hospedaje en Nazca (Casa Hacienda Nazca)",
      "2 noches de hospedaje en Cusco (Illa Hotel)",
      "Todos los desayunos (Box Breakfast para día Machu Picchu)",
      "Excursión Islas Ballestas y Balneario de Paracas",
      "Visita a Vitivinícola en Ica",
      "Paseo en Buggies y Sandboard en Huacachina",
      "Sobrevuelo a las Líneas de Nazca (incluye impuestos aeroportuarios)",
      "Traslado turístico Lima - Ica y Ica - Nazca (Pool)",
      "Tickets de bus Cruz del Sur Nazca - Lima",
      "City tour Arqueológico en Cusco",
      "Tour a Machu Picchu (Ingreso y Guía)",
      "Ticket de Tren Voyager o Expedition",
      "Boleto de bus Consetur subida y bajada",
      "Guía profesional bilingüe"
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
      "Comisión por transferencia de dinero"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Tour Cusco Básico + Paracas - Huacachina - Nazca: 6 Días - 5 Noches cargado exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    process.exit(1);
  }
}

seedCuscoNazca6D();
