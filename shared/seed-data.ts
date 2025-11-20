/**
 * DATOS CANÓNICOS DEL SISTEMA
 * 
 * Este archivo contiene la "fuente de verdad" de todos los destinos activos,
 * itinerarios, hoteles, inclusiones y exclusiones.
 * 
 * Estos datos se sincronizan automáticamente con la base de datos de producción
 * cada vez que se hace deploy.
 */

export const TURKEY_ESENCIAL_ID = 'a0edb8c2-7e77-444e-8221-2501fe87f338';

export const seedDestinations = [
  {
    id: TURKEY_ESENCIAL_ID,
    name: 'Turquía Esencial',
    country: 'Turquía',
    duration: 11,
    nights: 9,
    description: null,
    imageUrl: null,
    basePrice: '710.00',
    category: 'internacional',
    isPromotion: false,
    displayOrder: 999,
    isActive: true,
    requiresTuesday: false,
  },
];

export const seedItineraryDays = [
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 1, title: 'Estambul', description: 'Llegada al aeropuerto y traslado al hotel con un asistente de habla portuguesa / española. Llegada al hotel. Alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 2, title: 'Estambul', description: 'Desayuno en el hotel. Salida para una visita panorámica. Recorrido por una de las zonas más antiguas. Pasaremos por las murallas que rodean la ciudad, construidas en el siglo V y que han sido destruidas y reconstruidas cuatro veces. Durante todo el recorrido podrá disfrutar de la maravillosa vista del Bósforo. El recorrido continúa por Dolmabahce, el estadio Beeiktae, Taksim, Siehane y Eminonu. Nota: Los pasajeros que no adquieran la visita panorámica posterior opcional dispondrán de tiempo libre y regresarán al hotel por su cuenta.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 3, title: 'Estambul - Ancara - Capadócia', description: 'Suplemento no obligatorio de vuelo interno IST-CAP. Desayuno en el hotel y salida hacia Ankara. Llegada y visita panorámica de la ciudad con parada en el mausoleo de Ataturk. Continuación hacia Capadocia. Llegada al hotel. Cena en el hotel y alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 4, title: 'Capadócia', description: 'Desayuno en el hotel. Salida para visitar la ciudad subterránea de Ozkonak, construida por comunidades cristianas que necesitaban protegerse de los romanos. Por la tarde, visita al Museo Abierto de Goreme, que alberga numerosas capillas y casas talladas en piedra y decoradas con frescos del siglo X, algunos de los cuales representan a San Jorge, que nació allí. Visita a Avanos, tradicional por sus famosas alfombras hechas a mano con una técnica ancestral, donde tendremos la oportunidad de visitar una cooperativa especializada. Por la tarde visitaremos una joyería de piedras típicas de Capadocia. Cena en el hotel y alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 5, title: 'Capadócia', description: 'Desayuno en el hotel y visita a Avcilar y Guvercinlik, donde podrá disfrutar del paisaje único de la «Chimenea de las Hadas» con vistas a Capadocia. Visita a la ciudad troglodita de Uchisar en el punto más alto de Capadocia. Por la tarde, visita a una cooperativa de cerámica de Capadocia. Cena en el hotel y alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 6, title: 'Capadócia - Pamukkale', description: 'Desayuno en el hotel y salida hacia Pamukkale. Visita a una tienda Outlet. Llegada a Pamukkale. Visita de Hierápolis y del "Castillo de Algodón", una verdadera maravilla natural, con su increíble formación calcárea y sus piscinas blancas naturales. Cena en el hotel y alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 7, title: 'Pamukkale - Éfeso - Esmirna', description: 'Desayuno en el hotel y salida para visitar las ruinas de Éfeso, la antigua ciudad grecorromana mejor conservada de Turquía. Fue la capital asiática del Imperio Romano. Podrá ver la magnífica Biblioteca Celso y la Calle de Mármol, así como el teatro con capacidad para 25.000 personas. Aquí es donde San Pablo habló a sus seguidores. Almuerzo en un restaurante local. Visita de la Casa de la Virgen María, lugar religioso cristiano cerca de Éfeso, a siete kilómetros de Selcuk, donde, según la tradición, Juan el Evangelista llevó a la Virgen María después de la crucifixión de Cristo, huyendo de la persecución en Jerusalén, e incluso su bendita asunción, según los ortodoxos. Todavía tendremos tiempo de visitar un excelente punto de venta de cuero de alta calidad procedente de esta región. Cena en el hotel y alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 8, title: 'Esmirna - Bursa - Estambul', description: 'Desayuno en el hotel y salida hacia Bursa. Parada para visitar una tienda de exquisiteces turcas, las famosas Delicias Turcas. Visita panorámica de la ciudad que fue capital del Imperio Otomano antes de Edirne. Visita de la Mezquita Verde, el Mausoleo Verde, que fue construido a petición del Sultán Mehmet I. La mezquita está decorada con azulejos de Iznik de colores verde y turquesa. Mehmet I y su dinastía están enterrados en el Mausoleo Verde, que forma parte del complejo de la mezquita. En Bursa también tendremos la oportunidad de pasear por el mercado de la seda, donde se pueden comprar antigüedades, sedas, perfumes y pashminas. Regreso a Estambul. Llegada al hotel, alojamiento.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 9, title: 'Estambul', description: 'Desayuno en el hotel. Día libre.' },
  { destinationId: TURKEY_ESENCIAL_ID, dayNumber: 10, title: 'Estambul', description: 'Desayuno en el hotel y traslado al aeropuerto para el vuelo de regreso. Fin de nuestros servicios.' },
];

export const seedHotels = [
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Ramada Plaza Tekstilkent', category: '5*', location: 'Estambul' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Sundance Hotel Istanbul', category: '5*', location: 'Estambul' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'DoubleTree by Hilton Istanbul Topkapi', category: '5*', location: 'Estambul' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Ramada Cappadocia', category: '5*', location: 'Capadocia' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Avrasya Hotel', category: '5*', location: 'Capadocia' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Crowne Plaza Nevsehir', category: '5*', location: 'Capadocia' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Pamukale Kaya Thermal Hotel', category: '5*', location: 'Pamukkale' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Pam Thermal Hotel', category: '5*', location: 'Pamukkale' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Richmond Thermal', category: '5*', location: 'Pamukkale' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Radisson Hotel İzmir Aliaga', category: '5*', location: 'Kusadasi/Esmirna' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Hampton By Hilton Aliaga', category: '4*', location: 'Kusadasi/Esmirna' },
  { destinationId: TURKEY_ESENCIAL_ID, name: 'Faustina Hotel', category: '4*', location: 'Kusadasi/Esmirna' },
];

export const seedInclusions = [
  { destinationId: TURKEY_ESENCIAL_ID, item: '09 noches de alojamiento en los hoteles previstos o de categoría similar', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: '09 desayuno', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: '5 cenas en los hoteles del circuito, excepto Estambul', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Guía autorizado habla hispana o portuguesa', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Impuesto IVA', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Wi-Fi en el autobús durante todo el recorrido', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: '0,5 litros de agua mineral por persona y día en el vehículo', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Todas las entradas del itinerario', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Seguro de viaje', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Tiquetes internacionales', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'traslados aeropuerto - hotel - aeropuerto', displayOrder: 0 },
];

export const seedExclusions = [
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Bebidas con las comidas', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Excursiones opcionales. Excepto en: Plan Mejorado (incluye 8 almuerzos y actividades en Estambul)', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Gastos personales', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Equipaje adicional', displayOrder: 0 },
  { destinationId: TURKEY_ESENCIAL_ID, item: 'Propinas para el guía y el conductor (se sugieren 5 USD P.P. por día)', displayOrder: 0 },
];
