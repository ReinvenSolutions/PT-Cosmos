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

export const countryImageSets: Record<string, string[]> = {
  'Turquía': [
    path.join(ASSETS_PATH, 'turkey_istanbul_bosp_82a10332.jpg'),
    path.join(ASSETS_PATH, 'turkey_cappadocia_ca_3eca4b1c.jpg'),
    path.join(ASSETS_PATH, 'hagia_sophia_mosque__ecd33474.jpg')
  ],
  'Dubái': [
    path.join(ASSETS_PATH, 'burj_khalifa_dubai_s_0a51b3ef.jpg'),
    path.join(ASSETS_PATH, 'dubai_skyline_modern_3111f3fa.jpg'),
    path.join(ASSETS_PATH, 'dubai_desert_safari__a3820616.jpg')
  ],
  'Egipto': [
    path.join(ASSETS_PATH, 'pyramids_of_giza_egy_4d7d81d1.jpg'),
    path.join(ASSETS_PATH, 'egypt_luxor_ancient__fa66bb4d.jpg'),
    path.join(ASSETS_PATH, 'egypt_nile_river_cru_eb01b597.jpg')
  ],
  'Grecia': [
    path.join(ASSETS_PATH, 'santorini_greece_whi_25df22f7.jpg'),
    path.join(ASSETS_PATH, 'greece_athens_parthe_078be842.jpg'),
    path.join(ASSETS_PATH, 'greece_mykonos_white_034716bc.jpg')
  ],
  'Tailandia': [
    path.join(ASSETS_PATH, 'thai_temple_bangkok__f24eb488.jpg'),
    path.join(ASSETS_PATH, 'thailand_beach_phi_p_8f5dcfbf.jpg'),
    path.join(ASSETS_PATH, 'thailand_floating_ma_fee5ff2c.jpg')
  ],
  'Vietnam': [
    path.join(ASSETS_PATH, 'halong_bay_vietnam_b_483ce48e.jpg'),
    path.join(ASSETS_PATH, 'vietnam_rice_terrace_7063ae8b.jpg'),
    path.join(ASSETS_PATH, 'vietnam_hoi_an_ancie_5aef2cfa.jpg')
  ],
  'Perú': [
    path.join(ASSETS_PATH, 'machu_picchu_peru_an_85367025.jpg'),
    path.join(ASSETS_PATH, 'peru_cusco_city_plaz_4a297d1e.jpg'),
    path.join(ASSETS_PATH, 'peru_sacred_valley_m_89f0ed5a.jpg')
  ],
  'Colombia': [
    path.join(ASSETS_PATH, 'cartagena_colombia_c_b5845004.jpg'),
    path.join(ASSETS_PATH, 'medellin_colombia_ca_be5f2e82.jpg'),
    path.join(ASSETS_PATH, 'coffee_plantation_co_803c7456.jpg')
  ],
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
  // Si hay solo un destino, usar el set de imágenes del país para mostrar 3 imágenes diferentes
  if (destinations.length === 1) {
    const imageSet = getDestinationImageSet(destinations[0]);
    if (imageSet.length >= 3) {
      return imageSet.slice(0, 3);
    }
  }

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

export function getDestinationImageSet(destination: { name: string; country: string }): string[] {
  if (countryImageSets[destination.country]) {
    return countryImageSets[destination.country];
  }
  
  const singleImage = getDestinationImagePath(destination);
  if (singleImage) {
    return [singleImage, singleImage, singleImage];
  }
  
  return [];
}
