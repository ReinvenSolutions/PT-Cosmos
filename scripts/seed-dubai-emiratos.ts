import 'dotenv/config';
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions, destinationImages } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedDubaiEmirates() {
  console.log("Iniciando carga del programa DUBAI Y LOS EMIRATOS...");

  try {
    // Limpiar si existe
    await db.delete(destinations).where(
      and(
        eq(destinations.name, "DUBAI Y LOS EMIRATOS"),
        eq(destinations.country, "Emiratos Árabes Unidos")
      )
    );

    // Generar priceTiers dinámicos
    const priceTiers = [];
    
    // Período 1: Del 5 de enero al 30 de abril 2026 - $1,080 USD
    let currentDate = new Date(2026, 0, 5);
    const endDate1 = new Date(2026, 3, 30);
    
    while (currentDate <= endDate1) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (currentDate.getDay() !== 1) { // Excluir lunes
        priceTiers.push({ endDate: dateStr, price: "1080.00" });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Período 2: Del 1 de mayo al 30 de septiembre 2026 - $820 USD
    currentDate = new Date(2026, 4, 1);
    const endDate2 = new Date(2026, 8, 30);
    
    while (currentDate <= endDate2) {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (currentDate.getDay() !== 1) { // Excluir lunes
        priceTiers.push({ endDate: dateStr, price: "820.00" });
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "DUBAI Y LOS EMIRATOS",
      description: "Descubre lo mejor de los Emiratos Árabes Unidos en 8 días. Explora Dubai, la capital Abu Dhabi, el emirato cultural Sharjah y la costa de Fujairah. Incluye safari por el desierto con cena BBQ, crucero en Dhow tradicional, y visitas a la Mezquita Sheikh Zayed, Burj Khalifa, Burj Al Arab y más.",
      basePrice: "1080.00",
      duration: 8,
      nights: 7,
      country: "Emiratos Árabes Unidos",
      imageUrl: "/images/destinations/dubai-maravilloso/5.jpg",
      isPromotion: false,
      category: "internacional",
      isActive: true,
      displayOrder: 3, // Después de Turquía (1) y Dubai Maravilloso (2)
      allowedDays: ['tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'], // Todos excepto lunes
      priceTiers: priceTiers,
      upgrades: []
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "Hotel en Dubai 4*",
        category: "4 estrellas",
        location: "Dubai",
        description: "Hotel con todas las comodidades en Dubai"
      }
    ].map(hotel => ({
      ...hotel,
      destinationId: destination.id
    }));

    await db.insert(hotels).values(hotelsData);
    console.log("Hoteles insertados");

    // 3. Insertar Itinerario (8 días)
    const itineraryData = [
      {
        dayNumber: 1,
        title: "DUBAI - Llegada",
        location: "Dubai",
        description: `Llegada a Dubai:
• Llegada al aeropuerto de Dubái
• Asistencia de habla hispana fuera del aeropuerto por parte de nuestro representante
• Traslado al hotel y alojamiento`,
        activities: ["Llegada al aeropuerto", "Traslado al hotel"],
        meals: [],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 2,
        title: "DUBAI - City Tour",
        location: "Dubai",
        description: `Visita por la ciudad de Dubai:
• Salida hacia Deira pasando por el Zoco de las especies y Zoco de Oro
• Atravesando el Canal por Abra (Taxi Acuático)
• Llegada y visita al Museo de Dubái
• Por la carretera de Jumeirah, vista de la Mezquita de Jumeirah
• Parada para fotos en el Burj al Arab único hotel en el mundo de 7 estrellas
• Parada torre más alta del mundo Burj Khalifa, el edificio más alto del mundo situado en el Dubái Mall (el Mall más grande del mundo con 1000 tiendas)
• Regreso al hotel`,
        activities: [
          "Visita al Zoco de las especies y Zoco de Oro",
          "Paseo en Abra (Taxi Acuático)",
          "Museo de Dubái",
          "Mezquita de Jumeirah",
          "Burj Al Arab (parada fotográfica)",
          "Burj Khalifa y Dubai Mall"
        ],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 3,
        title: "DUBAI / SHARJAH / CRUCERO DHOW",
        location: "Sharjah - Dubai",
        description: `Visita al emirato de Sharjah:
• Visita al Zoco Azul, conocido por la venta de artesanías
• Mezquita Faisal, regalo del difunto Rey Faisal al emirato de Sharjah
• Museo de la Civilización Islámica
• Por la noche salida a las 19:30 hrs para crucero en Dhow tradicional (2 horas)
• Navegación por Dubái Creek hasta el iluminado Dubái Creek Golf Club
• Regreso al hotel`,
        activities: [
          "Visita al Zoco Azul de Sharjah",
          "Mezquita Faisal",
          "Museo de la Civilización Islámica",
          "Crucero en Dhow tradicional (2 horas)"
        ],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 4,
        title: "DUBAI - Safari por el Desierto",
        location: "Dubai - Desierto",
        description: `Mañana libre
Alrededor de las 15:00-15:30 hrs safari por el desierto:
• Excitante trayecto en Land Cruisers por las altas dunas
• Fotografías de la puesta de sol árabe
• Campamento en el desierto con cena BBQ (cordero a la parrilla, brochetas)
• Danza del Vientre
• Actividades incluidas: Ski por la arena, pintado de henna, agua, refrescos, té y café
• Regreso al hotel`,
        activities: [
          "Mañana libre",
          "Safari por las dunas en 4x4",
          "Puesta de sol en el desierto",
          "Cena BBQ en campamento beduino",
          "Danza del vientre",
          "Ski por la arena",
          "Pintado de henna"
        ],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 5,
        title: "DUBAI / ABU DHABI / DUBAI",
        location: "Abu Dhabi",
        description: `Visita a Abu Dhabi (2 horas de recorrido):
• Puerto Jebel Ali, el puerto más grande del mundo realizado por el hombre
• Mezquita del Jeque Zayed, la tercera más grande del mundo y tumba del antiguo presidente de UAE
• Puente de Al Maqta y área de los Ministros
• Calle Corniche, comparada con Manhattan
• Parada fotográfica en Hotel Emirates Palace (con helipuerto y puerto propios)
• Al Batee Area, palacios de la familia Real
• Vista panorámica al Ferrari World
• Regreso a Dubai`,
        activities: [
          "Puerto Jebel Ali",
          "Mezquita del Jeque Zayed",
          "Puente de Al Maqta",
          "Calle Corniche",
          "Hotel Emirates Palace",
          "Palacios de la familia Real",
          "Ferrari World (vista panorámica)"
        ],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 6,
        title: "DUBAI / FUJAIRAH / DUBAI",
        location: "Fujairah - Costa Este",
        description: `Excursión a la Costa Este Fujairah:
• Paseo por el desierto a través del Oasis Al Daid hacia Masafi
• Parada en el Mercado de los viernes (frutas, plantas, cerámicas, tapices y regalos)
• Recorrido por las montañas de Hajar
• Bajada a las aguas azules del Golfo de Oman - Dibba
• Día de playa con almuerzo en hotel 4*
• Visita a la Mezquita Bidiyah, la más antigua de UAE
• Costa de Khorr Fakkan
• Paso por Fujairah, el único emirato en la costa este
• Regreso al hotel en Dubai`,
        activities: [
          "Oasis Al Daid",
          "Mercado de los viernes en Masafi",
          "Montañas de Hajar",
          "Golfo de Oman - Dibba",
          "Día de playa",
          "Mezquita Bidiyah (más antigua de UAE)",
          "Costa de Khorr Fakkan"
        ],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 7,
        title: "DUBAI - Día Libre",
        location: "Dubai",
        description: `Día libre para actividades personales:
• Disfrute de las compras en los centros comerciales
• Relájese en el hotel o explore Dubai por su cuenta`,
        activities: ["Día libre"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubai"
      },
      {
        dayNumber: 8,
        title: "DUBAI - Salida",
        location: "Dubai",
        description: `Último día del programa:
• Desayuno en el hotel
• A la hora prevista traslado al aeropuerto de Dubái
• Fin de Servicios`,
        activities: ["Desayuno", "Traslado al aeropuerto"],
        meals: ["Desayuno"],
        accommodation: null
      }
    ].map(day => ({
      ...day,
      destinationId: destination.id
    }));

    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      { item: "07 noches de hotel en Dubái en base de alojamiento y desayuno" },
      { item: "Visita de Dubái con guía de habla hispana" },
      { item: "Visita de Abu Dhabi con almuerzo incluido" },
      { item: "Safari por el desierto con cena BBQ y espectáculo de danza del vientre" },
      { item: "Cena a bordo de un barco tradicional Dhow" },
      { item: "Visita de los Emiratos Sharjah y Fujairah con almuerzo" },
      { item: "Todos los traslados se realizan en coches con aire acondicionado" },
      { item: "Traslado aeropuerto - hotel - aeropuerto con asistencia de habla hispana" },
      { item: "Ski por la arena durante safari" },
      { item: "Pintado de henna durante safari" },
      { item: "Agua, refrescos, té y café en safari" }
    ].map(inc => ({
      ...inc,
      destinationId: destination.id
    }));

    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      { item: "Fee bancario 2.5% sobre el total" },
      { item: "Visado de entrada (si requiere)" },
      { item: "Propinas durante todo el viaje" },
      { item: "Todo extra no mencionado en el itinerario" },
      { item: "Impuestos de hotel (TDF) 6$ por noche por cuarto - se paga directo al hotel" },
      { item: "Vuelos internacionales" },
      { item: "Seguro de viaje" },
      { item: "Gastos personales" }
    ].map(exc => ({
      ...exc,
      destinationId: destination.id
    }));

    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    // 6. Insertar Imágenes del destino (usar las de Dubai Maravilloso)
    const imagesData = [
      { imageUrl: "/images/destinations/dubai-maravilloso/1.jpg", displayOrder: 0 },
      { imageUrl: "/images/destinations/dubai-maravilloso/2.jpg", displayOrder: 1 },
      { imageUrl: "/images/destinations/dubai-maravilloso/3.jpg", displayOrder: 2 },
      { imageUrl: "/images/destinations/dubai-maravilloso/4.jpg", displayOrder: 3 },
      { imageUrl: "/images/destinations/dubai-maravilloso/5.jpg", displayOrder: 4 },
      { imageUrl: "/images/destinations/dubai-maravilloso/6.jpg", displayOrder: 5 },
      { imageUrl: "/images/destinations/dubai-maravilloso/7.jpg", displayOrder: 6 }
    ].map(img => ({
      ...img,
      destinationId: destination.id
    }));

    await db.insert(destinationImages).values(imagesData);
    console.log("Imágenes insertadas");

    console.log("\n✅ ¡Programa DUBAI Y LOS EMIRATOS cargado exitosamente!");
    console.log(`   - 8 días / 7 noches`);
    console.log(`   - Disponible: Martes a Domingo (todos excepto Lunes)`);
    console.log(`   - Precio base: $1,350 USD`);
    console.log(`   - 7 imágenes de Dubai`);
    
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    throw error;
  }
}

seedDubaiEmirates().then(() => process.exit(0));
