
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedFinlandiaAuroras() {
  try {
    console.log("Iniciando carga del programa Auroras boreales finlandia...");

    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Auroras boreales finlandia"),
            eq(destinations.country, "Finlandia")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Auroras boreales finlandia",
      country: "Finlandia",
      duration: 7,
      nights: 6,
      description: "Disfruta la belleza del ártico y las auroras boreales en este paraíso helado. Aprende sobre la cultura Sámi, experimenta actividades al aire libre y saborea la gastronomía del ártico. Un tour perfecto para desconectar de la ciudad y ver renos en su hábitat natural. Salidas: Todos los martes (Noviembre a Abril) entre 7:00 y 8:30 AM",
      basePrice: "0",
      category: "internacional",
      isPromotion: false,
      imageUrl: "https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&q=80", // Aurora Borealis placeholder
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "Alojamiento Previsto en Laponia",
        location: "Rovaniemi / Laponia",
        category: "Según disponibilidad",
        nights: 6,
        destinationId: destination.id
      }
    ];
    await db.insert(hotels).values(hotelsData);
    console.log("Hoteles insertados");

    // 3. Insertar Itinerario
    const itineraryData = [
      {
        dayNumber: 1,
        title: "Salida hacia el Ártico",
        description: "Encuentro en el punto de salida (entre 7:00 y 8:30 AM). Inicio del viaje de ida en tren desde Helsinki hacia Rovaniemi, la puerta de Laponia.",
        activities: ["Viaje en tren Helsinki - Rovaniemi"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Exploración de Laponia y Cultura Sámi",
        description: "Desayuno. Días dedicados a disfrutar de las impolutas tierras invernales. Actividades para aprender sobre la cultura Sámi y saborear la gastronomía local.",
        activities: ["Actividades culturales Sámi", "Gastronomía ártica"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Actividades al Aire Libre",
        description: "Desayuno. Continuación de las actividades incluidas en el tour. Posibilidad de ver renos corriendo por el bosque y disfrutar del paisaje del Círculo Polar Ártico.",
        activities: ["Avistamiento de renos", "Exploración del bosque"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Caza de Auroras Boreales",
        description: "Desayuno. Tiempo libre para relajarse o realizar actividades incluidas. Por la noche, condiciones ideales en la región para intentar avistar las auroras boreales.",
        activities: ["Posible avistamiento de Auroras Boreales"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Aventura en el Círculo Polar",
        description: "Desayuno. Día para seguir explorando las maravillas del invierno finlandés con las actividades y entradas a lugares de interés incluidas.",
        activities: ["Visita a lugares de interés incluidos"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Último día en el Paraíso Helado",
        description: "Desayuno. Último día completo para disfrutar del entorno ártico y las actividades programadas.",
        activities: ["Actividades finales del tour"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 7,
        title: "Regreso a Helsinki",
        description: "Desayuno. Viaje de regreso en tren desde Rovaniemi hacia Helsinki. Fin de los servicios.",
        activities: ["Viaje en tren Rovaniemi - Helsinki"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];
    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "6 noches de alojamiento",
      "Desayuno en el hotel",
      "Un guía profesional",
      "Viaje de ida y vuelta de Helsinki a Rovaniemi en tren",
      "Todas las actividades del tour incluidas",
      "Entradas para los lugares de interés",
      "Transporte entre el hotel/alojamiento y los lugares de interés"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      "Vuelos internacionales"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));
    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    console.log("¡Programa Auroras boreales finlandia cargado exitosamente!");
    process.exit(0);
  } catch (error) {
    console.error("Error al cargar el programa:", error);
    process.exit(1);
  }
}

seedFinlandiaAuroras();
