import 'dotenv/config';
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions, destinationImages } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seedCuscoAventura5D() {
  console.log("Iniciando carga del programa TOUR CUSCO AVENTURA 5D/4N...");

  try {
    // Limpiar si existe (tanto el nombre anterior como el nuevo)
    await db.delete(destinations).where(eq(destinations.name, "Tour Cusco Aventura: 5 Días - 4 Noches"));
    await db.delete(destinations).where(eq(destinations.name, "Tour Cusco Aventura"));

    // Generar priceTiers dinámicos - Precio válido hasta 30 Nov 2026
    const priceTiers = [];
    let currentDate = new Date(2025, 0, 1); // Desde 1 enero 2025
    const endDate = new Date(2026, 10, 30); // Hasta 30 noviembre 2026
    
    while (currentDate <= endDate) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      priceTiers.push({ endDate: dateStr, price: "629.00" });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Tour Cusco Aventura",
      description: "Tour de aventura completo por Cusco incluyendo City Tour Arqueológico, Machu Picchu, Laguna Humantay y la Montaña de 7 Colores (Vinicunca). Experimenta lo mejor de Cusco en 5 días inolvidables con actividades de trekking y cultura. Incluye 4 noches de hospedaje en hotel 3 estrellas.",
      basePrice: "629.00",
      duration: 5,
      nights: 4,
      country: "Perú",
      imageUrl: "/images/destinations/tour-cusco-aventura/1.jpg",
      isPromotion: false,
      category: "internacional",
      isActive: true,
      displayOrder: 25,
      allowedDays: [],
      priceTiers: priceTiers,
      upgrades: []
    }).returning();

    console.log(`✅ Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "ILLA HOTEL",
        category: "3 estrellas",
        location: "Cusco",
        description: "Hotel cómodo en el centro de Cusco con desayuno incluido"
      }
    ].map(hotel => ({
      ...hotel,
      destinationId: destination.id
    }));

    await db.insert(hotels).values(hotelsData);
    console.log("✅ Hoteles insertados");

    // 3. Insertar Itinerario (5 días)
    const itineraryData = [
      {
        dayNumber: 1,
        title: "LLEGADA A CUSCO / CITY TOUR ARQUEOLÓGICO",
        location: "Cusco",
        description: `Llegada y City Tour Arqueológico:
• 10:00 AM - Llegada a Cusco y traslado a hotel (hora recomendada)
• 2:00 PM - Recojo de hotel para inicio del City Tour (hora aproximada)
• Visita a: Sacsayhuaman, Kenko, Puka Pukará, Tambo Machay
• 6:30 PM - Fin del tour en Plaza San Francisco, cerca a la Plaza de Armas`,
        activities: [
          "Llegada a Cusco",
          "Traslado a hotel",
          "City Tour Arqueológico: Sacsayhuaman",
          "Visita a Kenko",
          "Puka Pukará",
          "Tambo Machay"
        ],
        meals: [],
        accommodation: "ILLA HOTEL - Cusco"
      },
      {
        dayNumber: 2,
        title: "TOUR MACHU PICCHU",
        location: "Machu Picchu - Aguas Calientes",
        description: `Tour a la maravilla del mundo Machu Picchu:
• 03:30 AM - Recojo de hotel (hora aproximada)
• 06:10 AM - Salida en tren VOYAGER/EXPEDITION hacia Aguas Calientes desde Ollantaytambo
• 07:40 AM - Llegada a Aguas Calientes y reunión de grupo
• 09:30 AM - Inicio de Tour guiado a Machu Picchu (hora aproximada)
• 01:00 PM - Fin del tour y retorno a Aguas Calientes (hora aproximada)
• 04:40 PM - Partida en tren hacia Ollantaytambo y luego traslado a Cusco (hora aproximada)
• 07:30 PM - Llegada a Cusco y fin del tour en Plaza San Francisco`,
        activities: [
          "Viaje en tren hacia Aguas Calientes",
          "Bus de subida a Machu Picchu",
          "Tour guiado por Machu Picchu (2.5 horas aprox)",
          "Tiempo libre en la ciudadela",
          "Retorno en bus a Aguas Calientes",
          "Viaje en tren de retorno a Cusco"
        ],
        meals: ["Box Breakfast"],
        accommodation: "ILLA HOTEL - Cusco"
      },
      {
        dayNumber: 3,
        title: "TOUR LAGUNA HUMANTAY",
        location: "Laguna Humantay - Mollepata",
        description: `Trekking a la impresionante Laguna Humantay:
• 04:30 AM - Recojo en hotel y partida a Mollepata (hora aproximada)
• 08:30 AM - Llegada a Mollepata e inicio del trekking a Laguna Humantay
• 11:00 AM - Llegada a Laguna Humantay (hora aproximada)
• Tiempo para disfrutar y tomar fotografías del paisaje turquesa
• 12:30 PM - Partida de retorno a Mollepata (hora aproximada)
• 03:00 PM - Retorno a Cusco
• 05:00 PM - Llegada a Cusco y fin del tour en Plaza San Francisco`,
        activities: [
          "Partida hacia Mollepata (2.5 horas)",
          "Desayuno en ruta",
          "Trekking hacia Laguna Humantay (1.5 horas)",
          "Tiempo libre en la laguna",
          "Almuerzo en Mollepata",
          "Retorno a Cusco"
        ],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "ILLA HOTEL - Cusco"
      },
      {
        dayNumber: 4,
        title: "TOUR VINICUNCA - LA MONTAÑA DE 7 COLORES",
        location: "Vinicunca - Cusipata",
        description: `Aventura en la famosa Montaña de 7 Colores:
• 04:30 AM - Recojo de hotel (hora aproximada)
• Viaje hacia Cusipata (2 horas aprox)
• Desayuno en ruta
• 09:30 AM - Inicio de caminata hacia Vinicunca (2 horas aprox)
• Llegada a la Montaña de 7 Colores - tiempo para fotos
• 12:00 PM - Almuerzo
• 12:30 PM - Retorno a Cusco
• 05:30 PM - Llegada a Cusco y fin del tour en Plaza San Francisco`,
        activities: [
          "Partida hacia Cusipata",
          "Desayuno en ruta",
          "Trekking hacia Vinicunca",
          "Montaña de 7 Colores (Vinicunca)",
          "Almuerzo incluido",
          "Retorno a Cusco"
        ],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "ILLA HOTEL - Cusco"
      },
      {
        dayNumber: 5,
        title: "VUELO DE RETORNO",
        location: "Cusco - Lima",
        description: `Último día y traslado al aeropuerto:
• Desayuno en el hotel
• 10:00 AM - Partida hacia aeropuerto (hora recomendada para vuelo 1:00 PM)
• 01:00 PM - Vuelo de salida recomendado
• Fin de servicios`,
        activities: [
          "Desayuno en el hotel",
          "Traslado al aeropuerto",
          "Fin de servicios"
        ],
        meals: ["Desayuno"],
        accommodation: null
      }
    ].map(day => ({
      ...day,
      destinationId: destination.id
    }));

    await db.insert(itineraryDays).values(itineraryData);
    console.log("✅ Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      { item: "Traslado Aeropuerto/Hotel/Aeropuerto - Cusco" },
      { item: "4 noches de hospedaje en Cusco - ILLA HOTEL (3 estrellas)" },
      { item: "Todos los desayunos en el hotel (Box Breakfast para Machu Picchu)" },
      { item: "City Tour Arqueológico - Cusco (Sacsayhuaman, Kenko, Puka Pukará, Tambo Machay)" },
      { item: "Tour a Machu Picchu con guía bilingüe" },
      { item: "Tour a Laguna Humantay (incluye desayuno y almuerzo)" },
      { item: "Tour a Vinicunca - Montaña de 7 Colores (incluye desayuno y almuerzo)" },
      { item: "Ticket de TREN VOYAGER o EXPEDITION" },
      { item: "BTG - Boleto Turístico General" },
      { item: "Ticket de ingreso a Machu Picchu" },
      { item: "Boleto de bus subida y bajada Aguas Calientes/Machu Picchu/Aguas Calientes" },
      { item: "Guía profesional bilingüe para todo el recorrido" },
      { item: "Bus turístico para todos los tours" }
    ].map(inc => ({
      ...inc,
      destinationId: destination.id
    }));

    await db.insert(inclusions).values(inclusionsData);
    console.log("✅ Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      { item: "Almuerzos (excepto los incluidos en Humantay y Vinicunca)" },
      { item: "Cenas" },
      { item: "Propinas" },
      { item: "Gastos personales" },
      { item: "Seguro de viaje" },
      { item: "Bebidas alcohólicas" },
      { item: "Todo lo no especificado en el programa" }
    ].map(exc => ({
      ...exc,
      destinationId: destination.id
    }));

    await db.insert(exclusions).values(exclusionsData);
    console.log("✅ Exclusiones insertadas");

    // 6. Insertar Imágenes del destino (usar imágenes de tour-cusco-aventura)
    const imagesData = [
      { imageUrl: "/images/destinations/tour-cusco-aventura/1.jpg", displayOrder: 0 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/2.jpg", displayOrder: 1 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/3.jpg", displayOrder: 2 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/4.jpg", displayOrder: 3 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/5.jpg", displayOrder: 4 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/6.jpg", displayOrder: 5 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/7.jpg", displayOrder: 6 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/8.jpg", displayOrder: 7 },
      { imageUrl: "/images/destinations/tour-cusco-aventura/9.jpg", displayOrder: 8 }
    ].map(img => ({
      ...img,
      destinationId: destination.id
    }));

    await db.insert(destinationImages).values(imagesData);
    console.log("✅ Imágenes insertadas");

    console.log("\n✅ ¡Programa TOUR CUSCO AVENTURA cargado exitosamente!");
    console.log(`   - Nombre: Tour Cusco Aventura`);
    console.log(`   - Duración: 5 días / 4 noches`);
    console.log(`   - Precio base: $629.00 USD`);
    console.log(`   - Incluye: City Tour, Machu Picchu, Humantay, Vinicunca`);
    console.log(`   - Hotel: ILLA HOTEL 3 estrellas`);
    console.log(`   - Imágenes: 9 fotos de tour-cusco-aventura`);
    
  } catch (error) {
    console.error("❌ Error al cargar el programa:", error);
    throw error;
  }
}

seedCuscoAventura5D().then(() => {
  console.log("\n✅ Proceso completado. Saliendo...");
  process.exit(0);
}).catch(error => {
  console.error("\n❌ Error fatal:", error);
  process.exit(1);
});
