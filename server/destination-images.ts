import path from "path";

const ASSETS_PATH = path.join(process.cwd(), "attached_assets", "stock_images");

export const countryImagePaths: Record<string, string> = {
  'Turquía': path.join(ASSETS_PATH, 'hagia_sophia_mosque__ecd33474.jpg'),
  'Dubái': path.join(ASSETS_PATH, 'burj_khalifa_dubai_s_0a51b3ef.jpg'),
  'Egipto': path.join(ASSETS_PATH, 'pyramids_of_giza_egy_4d7d81d1.jpg'),
  'Grecia': path.join(ASSETS_PATH, 'santorini_greece_whi_25df22f7.jpg'),
  'Tailandia': path.join(ASSETS_PATH, 'thai_temple_bangkok__f24eb488.jpg'),
  'Vietnam': path.join(ASSETS_PATH, 'halong_bay_vietnam_b_483ce48e.jpg'),
  'Perú': path.join(ASSETS_PATH, 'machu_picchu_peru_an_85367025.jpg'),
  'Colombia': path.join(ASSETS_PATH, 'cartagena_colombia_c_b5845004.jpg'),
};

export const destinationImagePaths: Record<string, string> = {
  'Cartagena Colonial y Playas de Barú': path.join(ASSETS_PATH, 'cartagena_colombia_c_b5845004.jpg'),
  'Medellín Ciudad de la Eterna Primavera': path.join(ASSETS_PATH, 'medellin_colombia_ca_be5f2e82.jpg'),
  'Eje Cafetero y Cultura Paisa': path.join(ASSETS_PATH, 'coffee_plantation_co_803c7456.jpg'),
  'San Andrés y Providencia': path.join(ASSETS_PATH, 'san_andres_caribbean_e211ffbb.jpg'),
  'Amazonas Selvático y Aventura': path.join(ASSETS_PATH, 'amazon_rainforest_ri_e3f6da86.jpg'),
  'La Guajira y Cabo de la Vela': path.join(ASSETS_PATH, 'la_guajira_desert_be_5a4f4bb5.jpg'),
  'Santander y Aventura Extrema': path.join(ASSETS_PATH, 'santander_adventure__6c5cbff4.jpg'),
};

export function getDestinationImagePath(destination: { name: string; country: string }): string | null {
  if (destinationImagePaths[destination.name]) {
    return destinationImagePaths[destination.name];
  }
  
  if (countryImagePaths[destination.country]) {
    return countryImagePaths[destination.country];
  }
  
  return null;
}

export function getDestinationImages(destinations: Array<{ name: string; country: string }>): string[] {
  const images: string[] = [];
  const seenCountries = new Set<string>();
  
  for (const dest of destinations) {
    const imagePath = getDestinationImagePath(dest);
    if (imagePath && images.length < 3 && !seenCountries.has(dest.country)) {
      images.push(imagePath);
      seenCountries.add(dest.country);
    }
  }
  
  if (images.length < 3) {
    for (const dest of destinations) {
      const imagePath = getDestinationImagePath(dest);
      if (imagePath && images.length < 3 && !images.includes(imagePath)) {
        images.push(imagePath);
      }
    }
  }
  
  if (images.length < 3 && images.length > 0) {
    while (images.length < 3) {
      images.push(images[0]);
    }
  }
  
  return images.slice(0, 3);
}
