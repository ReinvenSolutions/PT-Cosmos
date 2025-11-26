import { db } from "../server/db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";
import { sql } from "drizzle-orm";

async function seedTurquiaEgipto() {
  console.log("Iniciando carga del programa Turquía + Egipto...");

  try {
    // 1. Insertar el Destino Principal
    const [destination] = await db.insert(destinations).values({
      name: "Turquía + Egipto: Special Offer 17 Días",
      country: "Turquía, Egipto",
      duration: 17,
      nights: 15,
      description: "Recorrido completo combinando las joyas de Turquía (Estambul, Capadocia, Pamukkale, Éfeso) con la historia milenaria de Egipto y un crucero por el Nilo. Incluye tren de alta velocidad en Turquía y vuelos internos.",
      basePrice: "0", // Precio a definir
      category: "internacional",
      isPromotion: true,
      requiresTuesday: false, // Salida fija específica
      imageUrl: "/assets/turquia_egipto_cover.jpg", // Placeholder
      isActive: true
    }).returning();

    const destinationId = destination.id;
    console.log(`Destino creado con ID: ${destinationId}`);

    // 2. Insertar Hoteles
    await db.insert(hotels).values([
      { destinationId, name: "Hotel Previsto en Estambul", location: "Estambul", category: "Según Categoría Elegida", nights: 3 },
      { destinationId, name: "Hotel Previsto en Ankara", location: "Ankara", category: "Según Categoría Elegida", nights: 1 },
      { destinationId, name: "Hotel Previsto en Capadocia", location: "Capadocia", category: "Según Categoría Elegida", nights: 2 },
      { destinationId, name: "Hotel Previsto en Pamukkale", location: "Pamukkale", category: "Según Categoría Elegida", nights: 1 },
      { destinationId, name: "Hotel Previsto en Estambul (Regreso)", location: "Estambul", category: "Según Categoría Elegida", nights: 1 },
      { destinationId, name: "Hotel Previsto en El Cairo", location: "El Cairo", category: "Según Categoría Elegida", nights: 3 },
      { destinationId, name: "Crucero por el Nilo", location: "Nilo (Luxor/Aswan)", category: "Crucero Fluvial", nights: 4 }
    ]);
    console.log("Hoteles insertados.");

    // 3. Insertar Itinerario
    await db.insert(itineraryDays).values([
      {
        destinationId,
        dayNumber: 1,
        title: "Llegada a Estambul",
        location: "Estambul",
        description: "Llegada al aeropuerto internacional de Estambul. Encuentro con nuestro personal y traslado al hotel. Resto del día libre para pasear por su cuenta.",
        activities: ["Traslado de llegada"],
        meals: [],
        accommodation: "Hotel en Estambul"
      },
      {
        destinationId,
        dayNumber: 2,
        title: "Joyas de Estambul (Día Completo)",
        location: "Estambul",
        description: "Desayuno. Visita de día completo (Incluida en plan Special Offer): Mezquita de Santa Sofía, Palacio de Topkapi (con Tesoro y Harén), Mezquita Azul y el Hipódromo Romano. Visita al Gran Bazar. Incluye Almuerzo.",
        activities: ["Santa Sofía", "Palacio Topkapi", "Mezquita Azul", "Gran Bazar"],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Hotel en Estambul"
      },
      {
        destinationId,
        dayNumber: 3,
        title: "Bósforo, Balat y Parte Asiática",
        location: "Estambul",
        description: "Desayuno. Visita al barrio de Balat y paseo en barco por el Bósforo. Visita al Bazar de las Especias. Excursión incluida (Special Offer) con almuerzo: Mezquita de Solimán el Magnífico, Palacio de Beylerbeyi y Colina de Çamlica (parte asiática).",
        activities: ["Barrio Balat", "Crucero Bósforo", "Bazar Egipcio", "Mezquita Solimán", "Palacio Beylerbeyi"],
        meals: ["Desayuno", "Almuerzo"],
        accommodation: "Hotel en Estambul"
      },
      {
        destinationId,
        dayNumber: 4,
        title: "Tren Alta Velocidad a Ankara",
        location: "Ankara",
        description: "Desayuno. Traslado a la estación para tomar el Tren de Alta Velocidad hacia Ankara. Paisajes del lago Sapanca. Llegada a Ankara y traslado al hotel. Cena incluida.",
        activities: ["Tren Alta Velocidad Estambul-Ankara"],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Ankara"
      },
      {
        destinationId,
        dayNumber: 5,
        title: "Ankara y Ruta a Capadocia",
        location: "Capadocia",
        description: "Desayuno. Visita al Mausoleo de Atatürk y el Castillo de Ankara (Ciudadela). Visita al barrio Hamamönü. Salida hacia Capadocia pasando por el Lago Salado. Cena incluida.",
        activities: ["Mausoleo Atatürk", "Castillo de Ankara", "Lago Salado"],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Capadocia"
      },
      {
        destinationId,
        dayNumber: 6,
        title: "Capadocia: Paisajes Lunares y Globos",
        location: "Capadocia",
        description: "Amanecer: Paseo en Globo (Incluido en plan Special Offer). Desayuno. Excursión completa: Valle de Goreme, Uchisar, Urgup y Valle de los Palomares. Visita a taller artesanal. Noche: Cena espectáculo (Opcional).",
        activities: ["Paseo en Globo", "Valle de Goreme", "Uchisar", "Urgup"],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Capadocia"
      },
      {
        destinationId,
        dayNumber: 7,
        title: "Pamukkale y Hierápolis",
        location: "Pamukkale",
        description: "Desayuno. Salida hacia Pamukkale. Visita a la antigua Hierápolis y al Castillo de Algodón (travertinos blancos y piscinas termales). Cena incluida.",
        activities: ["Hierápolis", "Castillo de Algodón"],
        meals: ["Desayuno", "Cena"],
        accommodation: "Hotel en Pamukkale"
      },
      {
        destinationId,
        dayNumber: 8,
        title: "Éfeso, Casa de la Virgen y Vuelo a Estambul",
        location: "Estambul",
        description: "Desayuno. Visita a Éfeso (Teatro, Biblioteca). Visita a la Casa de la Virgen María. Traslado al aeropuerto de Izmir. Vuelo a Estambul. Traslado al hotel.",
        activities: ["Éfeso", "Casa de la Virgen María", "Vuelo Izmir-Estambul"],
        meals: ["Desayuno"],
        accommodation: "Hotel en Estambul"
      },
      {
        destinationId,
        dayNumber: 9,
        title: "Vuelo a El Cairo",
        location: "El Cairo",
        description: "Desayuno. Tiempo libre hasta el traslado al aeropuerto de Estambul para embarcar en el vuelo con destino El Cairo. Llegada a El Cairo, asistencia y traslado al hotel.",
        activities: ["Vuelo Estambul-El Cairo"],
        meals: ["Desayuno"],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 10,
        title: "Las Pirámides de Guiza",
        location: "El Cairo",
        description: "Desayuno. Visita a las Pirámides de Guiza (Keops, Kefrén, Micerinos) y la Gran Esfinge. Resto del día libre.",
        activities: ["Pirámides de Guiza", "Esfinge"],
        meals: ["Desayuno"],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 11,
        title: "Vuelo a Luxor y Crucero: Karnak",
        location: "Luxor",
        description: "Desayuno. Traslado al aeropuerto y vuelo a Luxor. Embarque en crucero. Almuerzo. Visita a los Templos de Karnak y Templo de Luxor. Cena a bordo.",
        activities: ["Vuelo a Luxor", "Templo de Karnak", "Templo de Luxor"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 12,
        title: "Valle de los Reyes y Edfu",
        location: "Edfu",
        description: "Pensión completa. Visita (Incluida en Special Offer): Valle de los Reyes, Colosos de Memnón y Templo de Hatshepsut. Navegación a Edfu.",
        activities: ["Valle de los Reyes", "Colosos de Memnón", "Templo de Hatshepsut"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 13,
        title: "Templos de Edfu y Kom Ombo",
        location: "Aswan",
        description: "Pensión completa. Visita al Templo de Horus en Edfu. Navegación. Visita al Templo de Sobek y Horus en Kom Ombo (Museo de Cocodrilos). Navegación a Aswan.",
        activities: ["Templo de Horus", "Templo de Kom Ombo"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 14,
        title: "Aswan: Philae y Presa",
        location: "Aswan",
        description: "Pensión completa. Visita al Templo de Philae, Obelisco Inacabado y la Gran Presa de Aswan. Noche en Aswan.",
        activities: ["Templo de Philae", "Obelisco Inacabado", "Presa de Aswan"],
        meals: ["Desayuno", "Almuerzo", "Cena"],
        accommodation: "Crucero por el Nilo"
      },
      {
        destinationId,
        dayNumber: 15,
        title: "Vuelo a El Cairo (Opcional Abu Simbel)",
        location: "El Cairo",
        description: "Desayuno y desembarque. Opcional: Visita a Abu Simbel. Traslado al aeropuerto de Aswan. Vuelo a El Cairo. Traslado al hotel.",
        activities: ["Vuelo Aswan-El Cairo"],
        meals: ["Desayuno"],
        accommodation: "Hotel en El Cairo"
      },
      {
        destinationId,
        dayNumber: 16,
        title: "Salida de El Cairo",
        location: "El Cairo",
        description: "Desayuno. Tiempo libre hasta la hora del traslado al aeropuerto de El Cairo para embarcar en su vuelo. Fin de servicios.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        accommodation: null
      }
    ]);
    console.log("Itinerario insertado.");

    // 4. Insertar Inclusiones
    await db.insert(inclusions).values([
      { destinationId, item: "Traslados aeropuerto con habla hispana", displayOrder: 1 },
      { destinationId, item: "Todos los desayunos", displayOrder: 2 },
      { destinationId, item: "12 comidas (almuerzos y cenas según itinerario)", displayOrder: 3 },
      { destinationId, item: "Alojamiento 11 noches en hoteles + 4 noches en Crucero Nilo", displayOrder: 4 },
      { destinationId, item: "Vuelo interno Izmir - Estambul", displayOrder: 5 },
      { destinationId, item: "Vuelos internos El Cairo - Luxor / Aswan - El Cairo", displayOrder: 6 },
      { destinationId, item: "Tren de Alta Velocidad Estambul - Ankara", displayOrder: 7 },
      { destinationId, item: "Paseo en Globo en Capadocia", displayOrder: 8 },
      { destinationId, item: "Visitas Turquía: Ankara, Capadocia, Pamukkale, Éfeso", displayOrder: 9 },
      { destinationId, item: "Excursión Estambul: Barco Bósforo y Barrio Balat", displayOrder: 10 },
      { destinationId, item: "Visita día completo Estambul con Santa Sofía y almuerzo", displayOrder: 11 },
      { destinationId, item: "Visitas Egipto: Pirámides, Valle de los Reyes, Templos (Luxor, Karnak)", displayOrder: 12 },
      { destinationId, item: "Guía acompañante en español", displayOrder: 13 },
      { destinationId, item: "Seguro de viaje y asistencia médica", displayOrder: 14 },
      { destinationId, item: "Tasas hoteleras y propinas para guía/conductor", displayOrder: 15 }
    ]);
    console.log("Inclusiones insertadas.");

    // 5. Insertar Exclusiones
    await db.insert(exclusions).values([
      { destinationId, item: "Bebidas en las comidas", displayOrder: 1 },
      { destinationId, item: "Entradas al interior de las pirámides", displayOrder: 2 },
      { destinationId, item: "Visado no incluido", displayOrder: 3 },
      { destinationId, item: "Maleteros no incluidos", displayOrder: 4 },
      { destinationId, item: "Vuelo interno Estambul - El Cairo (Verificar detalle de tiquetes)", displayOrder: 5 },
      { destinationId, item: "Gastos personales y otros servicios no especificados", displayOrder: 6 }
    ]);
    console.log("Exclusiones insertadas.");

    console.log("¡Programa Turquía + Egipto cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedTurquiaEgipto();
