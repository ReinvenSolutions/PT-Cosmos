/**
 * URLs de imágenes de destinos - Supabase Storage (prioridad)
 * La API devuelve imageUrl desde la BD; los fallbacks usan Supabase cuando está disponible.
 */

function slugFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Construye URL Supabase para plan-{slug}/{file} */
function supabasePlanUrl(slug: string, file: string, base?: string): string {
  const storageBase = base || "https://himyxbrdsnxryetlogzk.supabase.co/storage/v1/object/public";
  return `${storageBase}/plan-${slug}/${file}`;
}

/** Mapeo plan-slug → primera imagen (fallback cuando imageUrl es null) */
const planSlugToImage: Record<string, string> = {
  amazonas: "1.jpg",
  "amazonas-encuentro-selva": "1.jpg",
  "auroras-boreales-finlandia": "1.jpg",
  capurgana: "1.jpg",
  "dubai-maravilloso": "1.jpg",
  "egipto-con-crucero-emiratos-salida-especial-mayo": "1.jpg",
  "espana-e-italia-turistica-euro-express": "1.jpg",
  "gran-tour-de-europa": "1.jpg",
  "guajira-cabo-de-la-vela-y-punta-gallinas": "1.jpg",
  "italia-turistica-euro-express": "1.jpg",
  "lisboa-espana-y-roma-euro-express": "1.jpg",
  "lo-mejor-de-cusco-4-dias-3-noches": "1.jpg",
  "lo-mejor-de-cusco-lima-7-dias-6-noches": "1.jpg",
  "peru-7d-6n-lima-y-cusco": "1.jpg",
  "puebliando-santander": "1.jpg",
  santander: "1.jpg",
  "tour-cusco-aventura": "1.jpg",
  "tour-cusco-basico-huacachina-5-dias-4-noches": "1.jpg",
  "tour-cusco-basico-paracas-huacachina-nazca-6-dias-5-noches": "1.jpg",
  "tour-cusco-completo-lima-paracas-nazca-huacachina-10-dias-9-noches": "1.jpg",
  "turquia-esencial": "1.jpg",
};

export const countryImages: Record<string, string> = {
  Turquía: supabasePlanUrl("turquia-esencial", "1.jpg"),
  Dubái: supabasePlanUrl("dubai-maravilloso", "1.jpg"),
  Egipto: supabasePlanUrl("egipto-con-crucero-emiratos-salida-especial-mayo", "1.jpg"),
  Grecia: supabasePlanUrl("gran-tour-de-europa", "1.jpg"),
  Tailandia: supabasePlanUrl("gran-tour-de-europa", "2.jpg"),
  Vietnam: supabasePlanUrl("gran-tour-de-europa", "3.jpg"),
  Perú: supabasePlanUrl("lo-mejor-de-cusco-4-dias-3-noches", "1.jpg"),
  Colombia: supabasePlanUrl("capurgana", "1.jpg"),
};

export const destinationImages: Record<string, string> = {
  "Cartagena Colonial y Playas de Barú": supabasePlanUrl("capurgana", "1.jpg"),
  "Medellín Ciudad de la Eterna Primavera": supabasePlanUrl("capurgana", "2.jpg"),
  "Eje Cafetero y Cultura Paisa": supabasePlanUrl("puebliando-santander", "1.jpg"),
  "San Andrés y Providencia": supabasePlanUrl("capurgana", "2.jpg"),
  "Amazonas Selvático y Aventura": supabasePlanUrl("amazonas", "1.jpg"),
  "La Guajira y Cabo de la Vela": supabasePlanUrl("guajira-cabo-de-la-vela-y-punta-gallinas", "1.jpg"),
  "Santander y Aventura Extrema": supabasePlanUrl("santander", "1.jpg"),
  "Gran Tour de Europa": supabasePlanUrl("gran-tour-de-europa", "1.jpg"),
};

export function getDestinationImage(
  destination: { name: string; country: string; imageUrl?: string | null },
  storageBase?: string
): string {
  if (destination.imageUrl) {
    return destination.imageUrl;
  }

  const slug = slugFromName(destination.name);
  const file = planSlugToImage[slug];
  if (file) {
    return supabasePlanUrl(slug, file, storageBase);
  }

  if (destinationImages[destination.name]) {
    return storageBase
      ? destinationImages[destination.name].replace(
          "https://himyxbrdsnxryetlogzk.supabase.co/storage/v1/object/public",
          storageBase
        )
      : destinationImages[destination.name];
  }

  if (countryImages[destination.country]) {
    return storageBase
      ? countryImages[destination.country].replace(
          "https://himyxbrdsnxryetlogzk.supabase.co/storage/v1/object/public",
          storageBase
        )
      : countryImages[destination.country];
  }

  return "";
}
