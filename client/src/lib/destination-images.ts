// Usar rutas públicas en lugar de imports para evitar problemas con Docker
const turkeyImg = '/images/destinations/turquia-esencial/1.jpg';
const dubaiImg = '/images/destinations/dubai-maravilloso/1.jpg';
const egyptImg = '/images/destinations/egipto-con-crucero-emiratos-salida-especial-mayo/1.jpg';
const greeceImg = '/images/destinations/gran-tour-de-europa/1.jpg';
const thailandImg = '/images/destinations/gran-tour-de-europa/2.jpg';
const vietnamImg = '/images/destinations/gran-tour-de-europa/3.jpg';
const peruImg = '/images/destinations/lo-mejor-de-cusco-4-dias-3-noches/1.jpg';
const cartagenaImg = '/images/destinations/capurgana/1.jpg';
const medellinImg = '/images/destinations/guajira-cabo-de-la-vela-y-punta-gallinas/1.jpg';
const ejeImg = '/images/destinations/puebliando-santander/1.jpg';
const sanAndresImg = '/images/destinations/capurgana/2.jpg';
const amazonasImg = '/images/destinations/amazonas/1.jpg';
const guajiraImg = '/images/destinations/guajira-cabo-de-la-vela-y-punta-gallinas/1.jpg';
const santanderImg = '/images/destinations/santander/1.jpg';

export const countryImages: Record<string, string> = {
  'Turquía': turkeyImg,
  'Dubái': dubaiImg,
  'Egipto': egyptImg,
  'Grecia': greeceImg,
  'Tailandia': thailandImg,
  'Vietnam': vietnamImg,
  'Perú': peruImg,
  'Colombia': cartagenaImg,
};

export const destinationImages: Record<string, string> = {
  'Cartagena Colonial y Playas de Barú': cartagenaImg,
  'Medellín Ciudad de la Eterna Primavera': medellinImg,
  'Eje Cafetero y Cultura Paisa': ejeImg,
  'San Andrés y Providencia': sanAndresImg,
  'Amazonas Selvático y Aventura': amazonasImg,
  'La Guajira y Cabo de la Vela': guajiraImg,
  'Santander y Aventura Extrema': santanderImg,
};

export function getDestinationImage(destination: { name: string; country: string; imageUrl?: string | null }): string {
  if (destination.imageUrl) {
    return destination.imageUrl;
  }
  
  if (destinationImages[destination.name]) {
    return destinationImages[destination.name];
  }
  
  if (countryImages[destination.country]) {
    return countryImages[destination.country];
  }
  
  return '';
}
