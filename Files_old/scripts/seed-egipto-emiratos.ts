import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedEgiptoEmiratos() {
  console.log("Iniciando carga del programa Egipto (Con Crucero) + Emiratos...");

  try {
    // 1. Insertar el Destino Principal
    const [destination] = await db.insert(destinations).values({
      name: "Egipto (Con Crucero) + Emiratos: Salida Especial Mayo",
      country: "Egipto, Emiratos Árabes Unidos",
      duration: 12,
      nights: 10,
      description: "Viaje combinado de 12 días explorando la historia milenaria de Egipto y la modernidad de Dubái. Incluye crucero por el Nilo con pensión completa, visitas a las Pirámides de Guiza, templos en Luxor y Aswan, y un recorrido completo por Dubái (antiguo y moderno).",
      basePrice: "0", // Precio a definir
      category: "internacional",
      isPromotion: true,
      requiresTuesday: false, // Salida fija específica
      imageUrl: "/assets/egipto_dubai_cover.jpg", // Placeholder
      isActive: true
    }).returning();

    const destinationId = destination.id;
    console.log(`Destino creado con ID: ${destinationId}`);

    // 2. Insertar Hoteles
    await db.insert(hotels).values([
      { destinationId, name: "Hotel Previsto en El Cairo (Ej: Swiss Inn Plaza / Triumph Plaza)", location: "El Cairo", category: "Según Categoría Elegida", nights: 3 },
      { destinationId, name: "Crucero MS Nile Premium / MS Sarah o similar", location: "Nilo (Luxor/Aswan)", category: "Crucero Fluvial", nights: 3 },
      { destinationId, name: "Hotel Previsto en Dubái (Ej: Golden Tulip Media / Time Asma)", location: "Dubai", category: "Según Categoría Elegida", nights: 4 }
    ]);
    console.log("Hoteles insertados.");

    // 3. Insertar Itinerario
    await db.insert(itineraryDays).values([
      {
        destinationId,
        dayNumber: 1,
        title: "Llegada a El Cairo",
        location: "El Cairo",
        description: "Llegada al aeropuerto de El Cairo (13 de Mayo). Asistencia y traslado al hotel. Tiempo libre en la capital de Egipto, conocida como la 'Madre del Mundo'. Alojamiento.",
        activities: ["Traslado de llegada"],
        meals: [],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 2,
        title: "Pirámides de Guiza y Museo del Papiro",
        location: "El Cairo",
        description: "Desayuno. Visita al recinto arqueológico de las Pirámides de Guiza (Keops, Kefrén y Micerinos) y la Gran Esfinge. Visita al Museo del Papiro. Almuerzo incluido. Tarde libre u opcional: Museo Egipcio, Ciudadela de Saladino y Mezquita de Alabastro.",
        activities: ["Pirámides de Guiza", "Gran Esfinge", "Museo del Papiro", "Museo Egipcio (Opcional)", "Ciudadela de Saladino (Opcional)"],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 3,
        title: "Vuelo a Aswan y Crucero por el Nilo",
        location: "Aswan",
        description: "Desayuno. Traslado al aeropuerto para vuelo a Aswan. Traslado al barco. Visita al Obelisco Inacabado y la Gran Presa de Aswan. Tarde libre u opcional: Paseo en faluca al Templo de Philae. Pensión completa a bordo.",
        activities: ["Vuelo a Aswan", "Obelisco Inacabado", "Presa de Aswan", "Templo de Philae (Opcional)"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 4,
        title: "Kom Ombo y Navegación a Edfu",
        location: "Kom Ombo",
        description: "Pensión completa. Opcional temprano: Templo de Abu Simbel. Navegación a Kom Ombo y visita del templo dedicado a Sobek y Haroeris. Visita al museo del cocodrilo. Navegación hacia Edfu.",
        activities: ["Abu Simbel (Opcional)", "Templo de Kom Ombo", "Museo del Cocodrilo"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 5,
        title: "Templo de Edfu y Esclusa de Esna",
        location: "Luxor",
        description: "Pensión completa. Visita al Templo de Horus en Edfu (uno de los mejor conservados). Paso por la esclusa de Esna. Navegación hacia Luxor.",
        activities: ["Templo de Horus (Edfu)", "Esclusa de Esna"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 6,
        title: "Valle de los Reyes y Vuelo a El Cairo",
        location: "El Cairo",
        description: "Desayuno y desembarque. Visita al Valle de los Reyes, los Colosos de Memnón y el Templo de la Reina Hatshepsut. Traslado al aeropuerto y vuelo a El Cairo. Traslado al hotel.",
        activities: ["Valle de los Reyes", "Colosos de Memnón", "Templo de Hatshepsut", "Vuelo Luxor-El Cairo"],
        meals: ["Desayuno"],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 7,
        title: "Viaje a Dubái",
        location: "Dubai",
        description: "Desayuno. Traslado al aeropuerto de El Cairo para tomar vuelo hacia Dubái. Llegada, asistencia y traslado al hotel en Dubái. Resto del día libre.",
        activities: ["Traslado a aeropuertos", "Vuelo El Cairo-Dubái"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubái"
      },
      {
        destinationId,
        dayNumber: 8,
        title: "Dubái Clásico y Moderno",
        location: "Dubai",
        description: "Desayuno. Visita de la ciudad: Dubai Creek, barrio Bastakyia, Museo de Dubái (Fortaleza Al Fahidi). Cruce en Abra (taxi acuático) a los Zocos de Oro y Especias. Paradas fotográficas en Mezquita Jumeirah, Burj Al Arab, The Frame y Museo del Futuro. Noche opcional: Cena en barco Dhow.",
        activities: ["Barrio Bastakyia", "Museo de Dubái", "Paseo en Abra", "Zoco del Oro y Especias", "Burj Al Arab (Foto)", "The Frame (Foto)", "Cena Dhow (Opcional)"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubái"
      },
      {
        destinationId,
        dayNumber: 9,
        title: "Dubái (Opcional Abu Dhabi)",
        location: "Dubai",
        description: "Desayuno. Día libre. Opcional: Visita de día completo a Abu Dhabi, incluyendo la Gran Mezquita Sheikh Zayed, el Corniche y paradas fotográficas en Museo Louvre y Ferrari World. Incluye almuerzo en la opción.",
        activities: ["Abu Dhabi (Opcional)", "Gran Mezquita (Opcional)", "Ferrari World (Opcional)"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubái"
      },
      {
        destinationId,
        dayNumber: 10,
        title: "Dubái (Opcional Safari 4x4)",
        location: "Dubai",
        description: "Desayuno. Mañana libre para compras. Opcional tarde: Safari 4x4 en el desierto con puesta de sol, sandboarding y cena barbacoa en campamento beduino con espectáculo.",
        activities: ["Compras", "Safari Desierto 4x4 (Opcional)", "Cena Barbacoa (Opcional)"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Dubái"
      },
      {
        destinationId,
        dayNumber: 11,
        title: "Salida de Dubái",
        location: "Dubai",
        description: "Desayuno. A la hora indicada, traslado al aeropuerto de Dubái para el vuelo de regreso.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        accommodation: null
      }
    ]);
    console.log("Itinerario insertado.");

    // 4. Insertar Inclusiones
    await db.insert(inclusions).values([
      { destinationId, item: "Asistencia a la llegada y salida en aeropuertos con habla hispana", displayOrder: 1 },
      { destinationId, item: "Traslados de llegada y salida", displayOrder: 2 },
      { destinationId, item: "7 noches de alojamiento en hoteles indicados y 3 noches en crucero por el Nilo", displayOrder: 3 },
      { destinationId, item: "17 comidas según itinerario", displayOrder: 4 },
      { destinationId, item: "Tickets aéreos internos El Cairo-Aswan / Luxor-El Cairo", displayOrder: 5 },
      { destinationId, item: "Visita de las Pirámides de Guiza con almuerzo incluido", displayOrder: 6 },
      { destinationId, item: "Visitas en Luxor: Valle de los Reyes, Colosos de Memnon, Templo de Hatshepsut", displayOrder: 7 },
      { destinationId, item: "Visitas en Aswan: Presa de Aswan y Obelisco Inacabado", displayOrder: 8 },
      { destinationId, item: "Visita del Templo de Horus en Edfu y Templo de Kom Ombo", displayOrder: 9 },
      { destinationId, item: "Visita de Dubái Clásico y Moderno", displayOrder: 10 },
      { destinationId, item: "Guía acompañante de habla hispana en Egipto y guías locales en Dubái", displayOrder: 11 },
      { destinationId, item: "Entradas a los lugares de interés según itinerario", displayOrder: 12 },
      { destinationId, item: "Seguro de Viaje (cobertura 40.000 EUR)", displayOrder: 13 },
      { destinationId, item: "Detalle de bienvenida en Dubái (flores, dátiles) y regalo de despedida", displayOrder: 14 },
      { destinationId, item: "Maleteros en hoteles de Dubái", displayOrder: 15 }
    ]);
    console.log("Inclusiones insertadas.");

    // 5. Insertar Exclusiones
    await db.insert(exclusions).values([
      { destinationId, item: "Vuelo internacional El Cairo - Dubái (según nota día 7)", displayOrder: 1 },
      { destinationId, item: "Tasas hoteleras (aprox 20 AED por habitación/noche en Dubái)", displayOrder: 2 },
      { destinationId, item: "Propinas del crucero (aprox 60 USD por persona, pago obligatorio en destino)", displayOrder: 3 },
      { destinationId, item: "Propinas para guía y conductor", displayOrder: 4 },
      { destinationId, item: "Visado de entrada", displayOrder: 5 },
      { destinationId, item: "Bebidas en las comidas", displayOrder: 6 },
      { destinationId, item: "Entradas al interior de las Pirámides y Tumba de Tutankamón", displayOrder: 7 },
      { destinationId, item: "Visita a Abu Simbel", displayOrder: 8 },
      { destinationId, item: "Maleteros en aeropuertos", displayOrder: 9 }
    ]);
    console.log("Exclusiones insertadas.");

    console.log("¡Programa Egipto + Emiratos cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedEgiptoEmiratos();
