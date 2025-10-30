import { db } from "./db";
import { destinations, itineraryDays, hotels, inclusions, exclusions } from "@shared/schema";

export async function seedDatabase() {
  console.log("Starting database seed...");

  const turkeyDestinations = [
    {
      name: "Estambul y Capadocia",
      country: "Turkey",
      duration: 7,
      nights: 6,
      description: "Descubre la mágica combinación de Estambul y Capadocia. Visita mezquitas históricas, palacios imperiales y vuela en globo sobre los paisajes únicos de Capadocia.",
      displayOrder: 1,
    },
    {
      name: "Leyendas de Turquía",
      country: "Turkey",
      duration: 10,
      nights: 9,
      description: "Tour completo por las leyendas de Turquía. Explora ciudades antiguas, ruinas históricas y paisajes impresionantes.",
      displayOrder: 2,
    },
    {
      name: "Turquía Extra Regulares con Almuerzos",
      country: "Turkey",
      duration: 8,
      nights: 7,
      description: "Experiencia premium en Turquía con todas las comidas incluidas. Visita los sitios más emblemáticos con guías expertos.",
      displayOrder: 3,
    },
    {
      name: "Turquía Extra Regulares sin Almuerzos",
      country: "Turkey",
      duration: 8,
      nights: 7,
      description: "Tour flexible por Turquía con desayunos incluidos. Explora a tu ritmo los tesoros históricos del país.",
      displayOrder: 4,
    },
  ];

  const dubaiDestinations = [
    {
      name: "Dubai Esencial",
      country: "Dubai",
      duration: 3,
      nights: 2,
      description: "Escapada express a Dubai. Visita el Burj Khalifa, Dubai Mall y experimenta el lujo del desierto.",
      displayOrder: 10,
    },
    {
      name: "Dubai Clásico",
      country: "Dubai",
      duration: 4,
      nights: 3,
      description: "Tour clásico por Dubai. Incluye safari en el desierto, tour por la ciudad y visita a los principales atractivos.",
      displayOrder: 11,
    },
    {
      name: "Dubai Completo",
      country: "Dubai",
      duration: 5,
      nights: 4,
      description: "Experiencia completa en Dubai. Descubre tanto el Dubai moderno como el tradicional, con safari y crucero incluidos.",
      displayOrder: 12,
    },
    {
      name: "Dubai Extended",
      country: "Dubai",
      duration: 6,
      nights: 5,
      description: "Tour extendido por Dubai y Abu Dhabi. Visita la Gran Mezquita, Ferrari World y más atracciones.",
      displayOrder: 13,
    },
    {
      name: "Dubai Premium",
      country: "Dubai",
      duration: 8,
      nights: 7,
      description: "Experiencia premium en los Emiratos. Incluye Dubai, Abu Dhabi y tiempo libre para compras y relax.",
      displayOrder: 14,
    },
  ];

  const egyptDestinations = [
    {
      name: "Egipto Clásico",
      country: "Egypt",
      duration: 7,
      nights: 6,
      description: "Descubre las maravillas del Antiguo Egipto. Visita las Pirámides, el Valle de los Reyes y navega por el Nilo.",
      displayOrder: 20,
    },
    {
      name: "Egipto Extendido",
      country: "Egypt",
      duration: 8,
      nights: 7,
      description: "Tour completo por Egipto. Explora Cairo, Luxor, Aswan y relájate en la costa del Mar Rojo.",
      displayOrder: 21,
    },
    {
      name: "Egipto Completo",
      country: "Egypt",
      duration: 10,
      nights: 9,
      description: "La experiencia definitiva en Egipto. Incluye todos los sitios principales más Alexandria y el Mar Rojo.",
      displayOrder: 22,
    },
    {
      name: "Tour de Peregrinación 4 Días",
      country: "Egypt",
      duration: 4,
      nights: 3,
      description: "Tour espiritual por los sitios religiosos de Egipto. Visita monasterios coptos y lugares sagrados.",
      displayOrder: 23,
    },
    {
      name: "Tour de Peregrinación 5 Días",
      country: "Egypt",
      duration: 5,
      nights: 4,
      description: "Tour espiritual extendido. Incluye más sitios religiosos y tiempo para reflexión.",
      displayOrder: 24,
    },
  ];

  const greeceDestinations = [
    {
      name: "Grecia Clásica",
      country: "Greece",
      duration: 5,
      nights: 4,
      description: "Tour por la Grecia Clásica. Visita Atenas, Delfos, Meteora y descubre la cuna de la civilización occidental.",
      displayOrder: 30,
    },
  ];

  const thailandDestinations = [
    {
      name: "Tailandia Esencial",
      country: "Thailand",
      duration: 6,
      nights: 5,
      description: "Lo mejor de Tailandia. Explora Bangkok, visita templos dorados y disfruta de las playas tropicales.",
      displayOrder: 40,
    },
    {
      name: "Tailandia Completa",
      country: "Thailand",
      duration: 7,
      nights: 6,
      description: "Tour completo por Tailandia. Incluye Bangkok, Chiang Mai, mercados flotantes y islas paradisíacas.",
      displayOrder: 41,
    },
    {
      name: "Tailandia Extended",
      country: "Thailand",
      duration: 8,
      nights: 7,
      description: "Experiencia extendida en Tailandia. Más tiempo para explorar templos, playas y la cultura tailandesa.",
      displayOrder: 42,
    },
  ];

  const vietnamDestinations = [
    {
      name: "Vietnam Express",
      country: "Vietnam",
      duration: 4,
      nights: 3,
      description: "Tour express por Vietnam. Visita Hanoi, crucero por la Bahía de Halong y explora la cultura vietnamita.",
      displayOrder: 50,
    },
    {
      name: "Vietnam Clásico",
      country: "Vietnam",
      duration: 5,
      nights: 4,
      description: "Tour clásico por Vietnam. Incluye el norte, centro y sur del país con sus principales atracciones.",
      displayOrder: 51,
    },
    {
      name: "Vietnam Completo",
      country: "Vietnam",
      duration: 6,
      nights: 5,
      description: "Experiencia completa en Vietnam. De Hanoi a Ho Chi Minh, pasando por Hoi An y la Bahía de Halong.",
      displayOrder: 52,
    },
  ];

  const peruDestinations = [
    {
      name: "Cusco Express",
      country: "Peru",
      duration: 3,
      nights: 2,
      description: "Escapada rápida a Cusco. Visita Machu Picchu y el Valle Sagrado de los Incas.",
      displayOrder: 60,
    },
    {
      name: "Cusco Clásico",
      country: "Peru",
      duration: 4,
      nights: 3,
      description: "Tour clásico por Cusco. Incluye Machu Picchu, Valle Sagrado y city tour por la capital del Imperio Inca.",
      displayOrder: 61,
    },
    {
      name: "Cusco Completo",
      country: "Peru",
      duration: 5,
      nights: 4,
      description: "Experiencia completa en Cusco. Más tiempo para aclimatarse y explorar todas las maravillas incas.",
      displayOrder: 62,
    },
    {
      name: "Cusco Extended",
      country: "Peru",
      duration: 6,
      nights: 5,
      description: "Tour extendido por Cusco. Incluye sitios adicionales como la Montaña de 7 Colores o Laguna Humantay.",
      displayOrder: 63,
    },
    {
      name: "Cusco + Huacachina",
      country: "Peru",
      duration: 5,
      nights: 4,
      description: "Combina lo mejor de Cusco con el oasis de Huacachina. Machu Picchu y aventura en el desierto.",
      displayOrder: 64,
    },
    {
      name: "Cusco - Huacachina",
      country: "Peru",
      duration: 6,
      nights: 5,
      description: "Tour completo Cusco y Huacachina. Incluye Machu Picchu, sandboarding y paseo en buggy.",
      displayOrder: 65,
    },
    {
      name: "Cusco - Huacachina - Lima",
      country: "Peru",
      duration: 7,
      nights: 6,
      description: "Gran tour por Perú. Combina Cusco, Huacachina y Lima para una experiencia completa.",
      displayOrder: 66,
    },
    {
      name: "Cusco - Paracas - Lima",
      country: "Peru",
      duration: 9,
      nights: 8,
      description: "Tour extendido por Perú. Incluye Cusco, las Islas Ballestas en Paracas y la capital Lima.",
      displayOrder: 67,
    },
    {
      name: "Cusco + Viñac",
      country: "Peru",
      duration: 4,
      nights: 3,
      description: "Cusco con visita a viñedos. Combina historia inca con degustación de vinos peruanos.",
      displayOrder: 68,
    },
    {
      name: "Cusco - Viñac",
      country: "Peru",
      duration: 5,
      nights: 4,
      description: "Tour por Cusco y región vinícola. Machu Picchu y enoturismo en un solo viaje.",
      displayOrder: 69,
    },
  ];

  const allDestinations = [
    ...turkeyDestinations,
    ...dubaiDestinations,
    ...egyptDestinations,
    ...greeceDestinations,
    ...thailandDestinations,
    ...vietnamDestinations,
    ...peruDestinations,
  ];

  for (const dest of allDestinations) {
    console.log(`Creating destination: ${dest.name}`);
    const [createdDest] = await db.insert(destinations).values(dest).returning();

    const standardInclusions = [
      "Alojamiento en hoteles seleccionados",
      "Desayuno diario",
      "Traslados aeropuerto-hotel-aeropuerto",
      "Tours guiados en español",
      "Entradas a sitios turísticos mencionados",
      "Guía profesional",
      "Transporte en vehículo con aire acondicionado",
      "Seguro de viaje básico",
    ];

    const standardExclusions = [
      "Vuelos internacionales",
      "Comidas no mencionadas",
      "Bebidas alcohólicas",
      "Propinas para guías y conductores",
      "Gastos personales",
      "Seguro de viaje adicional",
      "Visas (si aplica)",
      "Actividades opcionales no mencionadas",
    ];

    const inclusionValues = standardInclusions.map((item, i) => ({
      destinationId: createdDest.id,
      item,
      displayOrder: i,
    }));
    await db.insert(inclusions).values(inclusionValues);

    const exclusionValues = standardExclusions.map((item, i) => ({
      destinationId: createdDest.id,
      item,
      displayOrder: i,
    }));
    await db.insert(exclusions).values(exclusionValues);

    const itineraryDaysToCreate = Math.min(dest.duration, 5);
    const itineraryValues = Array.from({ length: itineraryDaysToCreate }, (_, i) => {
      const day = i + 1;
      return {
        destinationId: createdDest.id,
        dayNumber: day,
        title: `Día ${day}${day === 1 ? " - Llegada" : day === dest.duration ? " - Salida" : ""}`,
        location: dest.name,
        description: `Itinerario detallado del día ${day}. Actividades y visitas programadas para este día del tour.`,
        activities: day === 1 ? ["Llegada", "Traslado al hotel", "Check-in"] : ["Tours guiados", "Visitas culturales", "Tiempo libre"],
        meals: day === 1 ? ["Cena"] : ["Desayuno", "Almuerzo"],
        accommodation: "Hotel seleccionado",
      };
    });
    await db.insert(itineraryDays).values(itineraryValues);

    const hotelCategories = ["5 estrellas", "4 estrellas", "Boutique"];
    const hotelCount = Math.min(Math.ceil(dest.nights / 2), 3);
    const hotelValues = Array.from({ length: hotelCount }, (_, i) => ({
      destinationId: createdDest.id,
      name: `Hotel ${dest.country} ${i + 1}`,
      category: hotelCategories[i % hotelCategories.length],
      location: dest.name,
      nights: Math.ceil(dest.nights / hotelCount),
    }));
    await db.insert(hotels).values(hotelValues);
  }

  console.log(`✅ Successfully seeded ${allDestinations.length} destinations!`);
}

seedDatabase().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
