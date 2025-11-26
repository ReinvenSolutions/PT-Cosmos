
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedCusco4D() {
  try {
    console.log("Iniciando carga del programa Lo Mejor de Cusco: 4 Días - 3 Noches...");

    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Lo Mejor de Cusco: 4 Días - 3 Noches"),
            eq(destinations.country, "Perú")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Lo Mejor de Cusco: 4 Días - 3 Noches",
      country: "Perú",
      duration: 4,
      nights: 3,
      description: "Experiencia completa en Cusco visitando la ciudad y sus centros arqueológicos, el Valle Sagrado con las Salineras de Maras y Moray, y la ciudadela de Machu Picchu con tren turístico incluido. Precios válidos hasta Noviembre 2026",
      basePrice: "0",
      category: "internacional",
      isPromotion: false,
      imageUrl: "https://images.unsplash.com/photo-1587595431973-160d0d94add1?auto=format&fit=crop&q=80", // Machu Picchu placeholder
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
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
        title: "Llegada a Cusco y City Tour Arqueológico",
        description: "Llegada a Cusco y traslado al hotel. Por la tarde (aprox. 14:00), inicio del City Tour visitando Sacsayhuaman, Kenko, Puka Pukará y Tambo Machay. Fin del tour cerca de la Plaza de Armas.",
        activities: ["Traslado de llegada", "City Tour Arqueológico", "Sacsayhuaman", "Kenko", "Puka Pukará", "Tambo Machay"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Valle Sagrado, Maras y Moray",
        description: "Desayuno. Recojo temprano (06:40 AM) para visitar Chinchero, las Salineras de Maras y los andenes de Moray. Almuerzo incluido. Visita a Ollantaytambo y Pisaq. Retorno a Cusco por la noche (19:00 PM).",
        activities: ["Chinchero", "Salineras de Maras", "Moray", "Ollantaytambo", "Pisaq"],
        meals: ["Desayuno", "Almuerzo"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Tour a Machu Picchu",
        description: "Recojo de madrugada (03:30 AM). Traslado a Ollantaytambo para tomar el tren a Aguas Calientes. Subida en bus y Tour guiado en Machu Picchu. Retorno en tren a Ollantaytambo y traslado final a Cusco.",
        activities: ["Tren a Machu Picchu", "Visita guiada Machu Picchu"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Despedida de Cusco",
        description: "Desayuno. A la hora indicada, traslado al aeropuerto para su vuelo de retorno.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];
    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Traslado Aeropuerto - Hotel - Aeropuerto en Cusco",
      "3 noches de hospedaje en Cusco (Illa Hotel 3*)",
      "Todos los desayunos (Box Breakfast para Machu Picchu)",
      "City tour Arqueológico en Cusco",
      "Tour a Salineras de Maras, Moray y Valle Sagrado con almuerzo",
      "Tour a Machu Picchu (Ingreso y Guía)",
      "Ticket de Tren Voyager Expedition",
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
      "Almuerzos (excepto el mencionado en Valle Sagrado)",
      "Cenas",
      "Comisiones por transferencia de pago"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Lo Mejor de Cusco: 4 Días - 3 Noches cargado exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    process.exit(1);
  }
}

seedCusco4D();
