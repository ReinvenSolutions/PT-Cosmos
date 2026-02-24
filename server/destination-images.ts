/**
 * Imágenes de destinos - exclusivamente desde Supabase Storage.
 * Todas las URLs son del formato: {SUPABASE_URL}/storage/v1/object/public/plan-{slug}/{file}
 */

const SUPABASE_URL = process.env.SUPABASE_URL || "";

function supabasePlanUrl(slug: string, file: string): string {
  if (!SUPABASE_URL) return "";
  const base = SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/plan-${slug}/${file}`;
}

/** Conjuntos de imágenes por plan (Supabase) */
function buildSupabaseSet(slug: string, count: number, ext = "jpg"): string[] {
  if (!SUPABASE_URL) return [];
  return Array.from({ length: count }, (_, i) => supabasePlanUrl(slug, `${i + 1}.${ext}`));
}

/** Imagen única por país (fallback) */
export const countryImagePaths: Record<string, string> = {
  Turquía: supabasePlanUrl("turquia-esencial", "1.png"),
  Dubái: supabasePlanUrl("dubai-maravilloso", "1.jpg"),
  Egipto: supabasePlanUrl("egipto-con-crucero-emiratos-salida-especial-mayo", "1.jpg"),
  Grecia: supabasePlanUrl("gran-tour-de-europa", "1.jpg"),
  Tailandia: supabasePlanUrl("gran-tour-de-europa", "2.jpg"),
  Vietnam: supabasePlanUrl("gran-tour-de-europa", "3.jpg"),
  Perú: supabasePlanUrl("lo-mejor-de-cusco-4-dias-3-noches", "1.jpg"),
  Colombia: supabasePlanUrl("capurgana", "1.jpg"),
};

/** Conjuntos de imágenes por país (3-6 imágenes) */
export const countryImageSets: Record<string, string[]> = {
  Turquía: buildSupabaseSet("turquia-esencial", 6, "png"),
  Dubái: buildSupabaseSet("dubai-maravilloso", 5),
  Egipto: buildSupabaseSet("egipto-con-crucero-emiratos-salida-especial-mayo", 6),
  Grecia: buildSupabaseSet("gran-tour-de-europa", 6),
  Tailandia: buildSupabaseSet("gran-tour-de-europa", 3),
  Vietnam: buildSupabaseSet("gran-tour-de-europa", 3),
  Perú: buildSupabaseSet("lo-mejor-de-cusco-4-dias-3-noches", 6),
  Colombia: buildSupabaseSet("capurgana", 6),
  "España, Francia, Suiza, Italia": buildSupabaseSet("gran-tour-de-europa", 6),
};

/** Imágenes por destino específico */
export const destinationImagePaths: Record<string, string> = {
  "Cartagena Colonial y Playas de Barú": supabasePlanUrl("capurgana", "1.jpg"),
  "Medellín Ciudad de la Eterna Primavera": supabasePlanUrl("capurgana", "2.jpg"),
  "Eje Cafetero y Cultura Paisa": supabasePlanUrl("puebliando-santander", "1.jpg"),
  "San Andrés y Providencia": supabasePlanUrl("capurgana", "2.jpg"),
  "Amazonas Selvático y Aventura": supabasePlanUrl("amazonas", "1.jpg"),
  "La Guajira y Cabo de la Vela": supabasePlanUrl("guajira-cabo-de-la-vela-y-punta-gallinas", "1.jpg"),
  "Santander y Aventura Extrema": supabasePlanUrl("puebliando-santander", "1.jpg"),
  "Gran Tour de Europa": supabasePlanUrl("gran-tour-de-europa", "1.jpg"),
  "Plan Amazonas 5 Días - 4 Noches 2025": supabasePlanUrl("amazonas", "1.jpg"),
  "Aventura en Santander": supabasePlanUrl("puebliando-santander", "1.jpg"),
  "Guajira Cabo de la Vela y Punta Gallinas": supabasePlanUrl("guajira-cabo-de-la-vela-y-punta-gallinas", "1.jpg"),
  Capurganá: supabasePlanUrl("capurgana", "1.jpg"),
  "Amazonas - Encuentro con la Selva": supabasePlanUrl("amazonas-encuentro-selva", "1.jpg"),
  "Puebliando por Santander": supabasePlanUrl("puebliando-santander", "1.jpg"),
};

const destinationSpecificImageSets: Record<string, string[]> = {
  "Plan Amazonas 5 Días - 4 Noches 2025": buildSupabaseSet("amazonas", 6),
  "Aventura en Santander": buildSupabaseSet("puebliando-santander", 6),
  "Guajira Cabo de la Vela y Punta Gallinas": buildSupabaseSet("guajira-cabo-de-la-vela-y-punta-gallinas", 6),
  Capurganá: buildSupabaseSet("capurgana", 6),
  "Amazonas - Encuentro con la Selva": buildSupabaseSet("amazonas-encuentro-selva", 6),
  "Puebliando por Santander": buildSupabaseSet("puebliando-santander", 6),
  "Turquía Esencial": buildSupabaseSet("turquia-esencial", 6, "png"),
  "Dubai Maravilloso": buildSupabaseSet("dubai-maravilloso", 7),
  "Gran Tour de Europa": buildSupabaseSet("gran-tour-de-europa", 8),
  "España e Italia Turística - Euro Express": buildSupabaseSet("espana-e-italia-turistica-euro-express", 8),
  "Italia Turística - Euro Express": buildSupabaseSet("italia-turistica-euro-express", 7),
  "Auroras Boreales Finlandia": buildSupabaseSet("auroras-boreales-finlandia", 10),
  "Tour Cusco Aventura": buildSupabaseSet("tour-cusco-aventura", 9),
};

export function getDestinationImagePath(destination: { name: string; country: string }): string | null {
  const url = destinationImagePaths[destination.name] || countryImagePaths[destination.country];
  return url || null;
}

export function getDestinationImages(destinations: Array<{ name: string; country: string; duration?: number }>): string[] {
  if (destinations.length === 1) {
    const imageSet = getDestinationImageSet(destinations[0]);
    if (imageSet.length >= 3) return imageSet.slice(0, 3);
  }

  const images: string[] = [];
  const seenCountries = new Set<string>();

  for (const dest of destinations) {
    const url = getDestinationImagePath(dest);
    if (url && images.length < 3 && !seenCountries.has(dest.country)) {
      images.push(url);
      seenCountries.add(dest.country);
    }
  }

  if (images.length < 3) {
    for (const dest of destinations) {
      const url = getDestinationImagePath(dest);
      if (url && images.length < 3 && !images.includes(url)) images.push(url);
    }
  }

  if (images.length < 3 && images.length > 0) {
    while (images.length < 3) images.push(images[0]);
  }

  return images.slice(0, 3);
}

export function getDestinationImageSet(destination: { name: string; country: string }): string[] {
  if (destinationSpecificImageSets[destination.name]) {
    return destinationSpecificImageSets[destination.name];
  }
  if (countryImageSets[destination.country]) {
    return countryImageSets[destination.country];
  }
  const singleImage = getDestinationImagePath(destination);
  if (singleImage) return [singleImage, singleImage, singleImage];
  return [];
}
