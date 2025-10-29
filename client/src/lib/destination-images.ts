import turkeyImg from '@assets/stock_images/hagia_sophia_mosque__ecd33474.jpg';
import dubaiImg from '@assets/stock_images/burj_khalifa_dubai_s_0a51b3ef.jpg';
import egyptImg from '@assets/stock_images/pyramids_of_giza_egy_4d7d81d1.jpg';
import greeceImg from '@assets/stock_images/santorini_greece_whi_25df22f7.jpg';
import thailandImg from '@assets/stock_images/thai_temple_bangkok__f24eb488.jpg';
import vietnamImg from '@assets/stock_images/halong_bay_vietnam_b_483ce48e.jpg';
import peruImg from '@assets/stock_images/machu_picchu_peru_an_85367025.jpg';
import cartagenaImg from '@assets/stock_images/cartagena_colombia_c_b5845004.jpg';
import medellinImg from '@assets/stock_images/medellin_colombia_ca_be5f2e82.jpg';
import ejeImg from '@assets/stock_images/coffee_plantation_co_803c7456.jpg';
import sanAndresImg from '@assets/stock_images/san_andres_caribbean_e211ffbb.jpg';
import amazonasImg from '@assets/stock_images/amazon_rainforest_ri_e3f6da86.jpg';
import guajiraImg from '@assets/stock_images/la_guajira_desert_be_5a4f4bb5.jpg';
import santanderImg from '@assets/stock_images/santander_adventure__6c5cbff4.jpg';

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
