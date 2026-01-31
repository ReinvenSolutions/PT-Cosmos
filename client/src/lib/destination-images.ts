// Usar URLs de Cloudinary para las imágenes de destinos
const turkeyImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732477/destinations/turquia-esencial/1.jpg';
const dubaiImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731947/destinations/dubai-maravilloso/1.jpg';
const egyptImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731960/destinations/egipto-con-crucero-emiratos-salida-especial-mayo/1.jpg';
const greeceImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731996/destinations/gran-tour-de-europa/1.jpg';
const thailandImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732000/destinations/gran-tour-de-europa/2.jpg';
const vietnamImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732002/destinations/gran-tour-de-europa/3.jpg';
const peruImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732054/destinations/lo-mejor-de-cusco-4-dias-3-noches/1.jpg';
const cartagenaImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731932/destinations/capurgana/1.jpg';
const medellinImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732017/destinations/guajira-cabo-de-la-vela-y-punta-gallinas/1.jpg';
const ejeImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732246/destinations/puebliando-santander/1.jpg';
const sanAndresImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731934/destinations/capurgana/2.jpg';
const amazonasImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769731893/destinations/amazonas/1.jpg';
const guajiraImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732017/destinations/guajira-cabo-de-la-vela-y-punta-gallinas/1.jpg';
const santanderImg = 'https://res.cloudinary.com/dcutgnihl/image/upload/v1769732259/destinations/santander/1.jpg';

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
