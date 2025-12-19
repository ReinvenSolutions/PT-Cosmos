
import 'dotenv/config';
import { db } from "../server/db";
import { destinations, hotels, itineraryDays, inclusions, exclusions, destinationImages } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function seedItaliaTuristica() {
  console.log("Iniciando carga del programa Italia Turística - Euro Express...");

  try {
    // Limpiar si existe
    await db.delete(destinations).where(
        and(
            eq(destinations.name, "Italia Turística - Euro Express"),
            eq(destinations.country, "Italia")
        )
    );

    // 1. Insertar Destino
    const [destination] = await db.insert(destinations).values({
      name: "Italia Turística - Euro Express",
      description: "Recorrido esencial por Italia de 7 días. Inicia en Roma con visita panorámica, continúa hacia Florencia para descubrir el Renacimiento, Venecia con paseo en barco y finaliza en la moderna Milán. Una inmersión rápida y completa en la cultura italiana.",
      basePrice: "1090.00",
      duration: 7,
      nights: 6,
      country: "Italia",
      imageUrl: "/images/destinations/italia-turistica-euro-express/1.jpg",
      isPromotion: false,
      category: "internacional",
      isActive: true,
      displayOrder: 6, // Después de Gran Tour Europa (5) y antes de España e Italia (7)
      allowedDays: ['friday'],
      priceTiers: [
        // Enero 2026
        { startDate: '2026-01-23', endDate: '2026-01-23', price: '1165.00' },
        // Febrero 2026
        { startDate: '2026-02-06', endDate: '2026-02-06', price: '1090.00' },
        { startDate: '2026-02-20', endDate: '2026-02-20', price: '1090.00' },
        // Marzo 2026
        { startDate: '2026-03-06', endDate: '2026-03-06', price: '1090.00' },
        { startDate: '2026-03-13', endDate: '2026-03-13', price: '1150.00' },
        { startDate: '2026-03-20', endDate: '2026-03-20', price: '1165.00' },
        { startDate: '2026-03-27', endDate: '2026-03-27', price: '1165.00' },
        // Abril 2026
        { startDate: '2026-04-03', endDate: '2026-04-03', price: '1240.00' },
        { startDate: '2026-04-10', endDate: '2026-04-10', price: '1245.00' },
        { startDate: '2026-04-17', endDate: '2026-04-17', price: '1245.00' },
        { startDate: '2026-04-24', endDate: '2026-04-24', price: '1245.00' },
        // Mayo 2026
        { startDate: '2026-05-01', endDate: '2026-05-01', price: '1290.00' },
        { startDate: '2026-05-08', endDate: '2026-05-08', price: '1290.00' },
        { startDate: '2026-05-15', endDate: '2026-05-15', price: '1290.00' },
        { startDate: '2026-05-22', endDate: '2026-05-22', price: '1290.00' },
        { startDate: '2026-05-29', endDate: '2026-05-29', price: '1290.00' },
        // Junio 2026
        { startDate: '2026-06-05', endDate: '2026-06-05', price: '1290.00' },
        { startDate: '2026-06-12', endDate: '2026-06-12', price: '1340.00' },
        { startDate: '2026-06-19', endDate: '2026-06-19', price: '1290.00' },
        { startDate: '2026-06-26', endDate: '2026-06-26', price: '1290.00' },
        // Julio 2026
        { startDate: '2026-07-03', endDate: '2026-07-03', price: '1240.00' },
        { startDate: '2026-07-10', endDate: '2026-07-10', price: '1240.00' },
        { startDate: '2026-07-17', endDate: '2026-07-17', price: '1205.00' },
        { startDate: '2026-07-24', endDate: '2026-07-24', price: '1220.00' },
        { startDate: '2026-07-31', endDate: '2026-07-31', price: '1190.00' },
        // Agosto 2026
        { startDate: '2026-08-07', endDate: '2026-08-07', price: '1185.00' },
        { startDate: '2026-08-14', endDate: '2026-08-14', price: '1185.00' },
        { startDate: '2026-08-21', endDate: '2026-08-21', price: '1185.00' },
        { startDate: '2026-08-28', endDate: '2026-08-28', price: '1185.00' },
        // Septiembre 2026
        { startDate: '2026-09-04', endDate: '2026-09-04', price: '1290.00' },
        { startDate: '2026-09-11', endDate: '2026-09-11', price: '1290.00' },
        { startDate: '2026-09-18', endDate: '2026-09-18', price: '1290.00' },
        { startDate: '2026-09-25', endDate: '2026-09-25', price: '1290.00' },
        // Octubre 2026
        { startDate: '2026-10-02', endDate: '2026-10-02', price: '1280.00' },
        { startDate: '2026-10-09', endDate: '2026-10-09', price: '1280.00' },
        { startDate: '2026-10-16', endDate: '2026-10-16', price: '1275.00' },
        { startDate: '2026-10-23', endDate: '2026-10-23', price: '1275.00' },
        { startDate: '2026-10-30', endDate: '2026-10-30', price: '1275.00' },
        // Noviembre 2026
        { startDate: '2026-11-06', endDate: '2026-11-06', price: '1200.00' },
        { startDate: '2026-11-13', endDate: '2026-11-13', price: '1200.00' },
        { startDate: '2026-11-27', endDate: '2026-11-27', price: '1130.00' },
        // Diciembre 2026
        { startDate: '2026-12-11', endDate: '2026-12-11', price: '1130.00' },
        { startDate: '2026-12-25', endDate: '2026-12-25', price: '1170.00' },
      ],
      upgrades: [
        { code: "VI", name: "Visitas incluidas", price: 120 },
        { code: "SI", name: "Special Incluido", description: "Visitas + Comidas", price: 230 }
      ]
    }).returning();

    console.log(`Destino creado con ID: ${destination.id}`);

    // 2. Insertar Hoteles
    const hotelsData = [
      {
        name: "The Brand Roma / Black Hotel / Pineta Palace",
        location: "Roma",
        category: "Clásico (Turista/Primera)",
        nights: 3,
        destinationId: destination.id
      },
      {
        name: "Ibis Firenze Nord / The Gate Florencia",
        location: "Florencia",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "Alexander Palace Abano / Da Poppi / B&B Padova",
        location: "Venecia (Área)",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      },
      {
        name: "B&B Milano Ornato / Ibis Milano Malpensa / B&B Malpensa",
        location: "Milán",
        category: "Clásico (Turista/Primera)",
        nights: 1,
        destinationId: destination.id
      }
    ];

    await db.insert(hotels).values(hotelsData);
    console.log("Hoteles insertados");

    // 3. Insertar Itinerario
    const itineraryData = [
      {
        dayNumber: 1,
        title: "Llegada a Roma",
        description: "Llegada a Roma y traslado al hotel. Alojamiento.",
        activities: ["Traslado de llegada"],
        meals: [],
        destinationId: destination.id
      },
      {
        dayNumber: 2,
        title: "Roma Imperial y Vaticano",
        description: "Desayuno. Opcional (o incluida en pack): Museos Vaticanos, Capilla Sixtina y Basílica de San Pedro. Visita panorámica de Roma: Castel Sant'Angelo, Isla Tiberina, Circo Máximo, Termas de Caracalla, etc. Opcional: Roma Antigua.",
        activities: ["Visita panorámica Roma", "Museos Vaticanos (Opcional/Incluido según plan)", "Roma Antigua (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 3,
        title: "Roma (Nápoles y Capri)",
        description: "Desayuno. Día libre. Opcional: Excursión de día completo a Nápoles (panorámica) y Capri (barco, lancha y visita de la isla). En invierno se sustituye Capri por Pompeya.",
        activities: ["Día libre", "Nápoles y Capri (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 4,
        title: "Roma - Florencia",
        description: "Desayuno. Salida hacia Florencia. Visita panorámica: Duomo de Santa Maria del Fiore, Campanario de Giotto, Baptisterio, Ponte Vecchio y Plaza de la Signoria. Tiempo libre u opcional 'Santa Croce y Florencia Medieval'.",
        activities: ["Visita panorámica Florencia", "Santa Croce (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 5,
        title: "Florencia - Venecia - Véneto",
        description: "Desayuno. Salida hacia Venecia. Paseo panorámico en barco por la laguna. Visita a fábrica de cristal de Murano y Plaza San Marcos. Opcional: Paseo en Góndola. Traslado al hotel en la región del Véneto.",
        activities: ["Barco en Venecia", "Fábrica de cristal Murano", "Paseo en Góndola (Opcional)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 6,
        title: "Véneto - Milán",
        description: "Desayuno. Salida hacia Milán. Tiempo libre para visitar el Castello Sforzesco, la Galería Vittorio Emanuele II y el Duomo. Alojamiento.",
        activities: ["Visita Milán", "Duomo de Milán (Exterior)"],
        meals: ["Desayuno"],
        destinationId: destination.id
      },
      {
        dayNumber: 7,
        title: "Salida de Milán",
        description: "Desayuno. Tiempo libre hasta la hora del traslado al aeropuerto para el vuelo de regreso. Fin de servicios.",
        activities: ["Traslado de salida"],
        meals: ["Desayuno"],
        destinationId: destination.id
      }
    ];

    await db.insert(itineraryDays).values(itineraryData);
    console.log("Itinerario insertado");

    // 4. Insertar Inclusiones
    const inclusionsData = [
      "Visitas panorámicas con guía local: Roma y Florencia",
      "Visitas comentadas por nuestro guía: Venecia y Milán",
      "Paseo panorámico en barco en Venecia",
      "Visita a fábrica de cristal de Murano",
      "Servicio de audio individual",
      "Guía acompañante de habla hispana",
      "Traslados de llegada y salida del aeropuerto principal",
      "Autocares modernos con medidas de seguridad",
      "Seguro de viaje",
      "Servicio de asistencia telefónica 24 horas",
      "Alojamiento en hoteles previstos (categoría turista/primera)"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));

    await db.insert(inclusions).values(inclusionsData);
    console.log("Inclusiones insertadas");

    // 5. Insertar Exclusiones
    const exclusionsData = [
      "Vuelos internacionales",
      "Tasas hoteleras (pago en destino)",
      "Propinas para guía y conductor",
      "Entradas a Museos Vaticanos (salvo si se compra el paquete opcional)",
      "Visado",
      "Maleteros",
      "Bebidas y comidas no especificadas"
    ].map(item => ({
      item: item,
      destinationId: destination.id
    }));

    await db.insert(exclusions).values(exclusionsData);
    console.log("Exclusiones insertadas");

    // 6. Insertar Imágenes del destino
    const imagesData = [
      { imageUrl: "/images/destinations/italia-turistica-euro-express/1.jpg", displayOrder: 0 },
      { imageUrl: "/images/destinations/italia-turistica-euro-express/2.jpg", displayOrder: 1 },
      { imageUrl: "/images/destinations/italia-turistica-euro-express/3.jpg", displayOrder: 2 }
    ].map(img => ({
      ...img,
      destinationId: destination.id
    }));

    await db.insert(destinationImages).values(imagesData);
    console.log("Imágenes insertadas");

    console.log("¡Programa Italia Turística - Euro Express cargado exitosamente!");
  } catch (error) {
    console.error("Error al cargar el programa:", error);
  }
}

seedItaliaTuristica();
