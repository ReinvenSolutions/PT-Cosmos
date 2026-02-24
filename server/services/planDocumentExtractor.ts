/**
 * Extrae y estructura la información de un plan de viaje desde texto plano
 * (obtenido de PDF o Word). Soporta modo IA (OpenAI) o heurístico.
 */

export type ExtractedPlan = {
  name: string;
  country: string;
  duration: number;
  nights: number;
  description: string;
  basePrice: string;
  itinerary: Array<{
    dayNumber: number;
    title: string;
    location?: string;
    description: string;
    activities?: string[];
    meals?: string[];
    accommodation?: string;
  }>;
  hotels: Array<{
    name: string;
    category?: string;
    location?: string;
    nights?: number;
  }>;
  inclusions: Array<{ item: string }>;
  exclusions: Array<{ item: string }>;
  priceTiers: Array<{
    startDate?: string;
    endDate: string;
    price: string;
    isFlightDay?: boolean;
    flightLabel?: string;
  }>;
  upgrades: Array<{
    code: string;
    name: string;
    description?: string;
    price: number;
  }>;
};

const EMPTY_PLAN: ExtractedPlan = {
  name: "",
  country: "",
  duration: 1,
  nights: 0,
  description: "",
  basePrice: "",
  itinerary: [],
  hotels: [],
  inclusions: [],
  exclusions: [],
  priceTiers: [],
  upgrades: [],
};

/** Parser heurístico: busca patrones comunes en documentos de viaje */
export function extractPlanHeuristic(rawText: string): ExtractedPlan {
  const text = rawText.trim();
  if (!text) return { ...EMPTY_PLAN };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const result: ExtractedPlan = {
    ...EMPTY_PLAN,
    inclusions: [],
    exclusions: [],
    itinerary: [],
    hotels: [],
    priceTiers: [],
    upgrades: [],
  };

  // País: extraer PRIMERO para no confundirlo con el nombre del plan
  const countryMatch = text.match(/(?:país|pais|destino|country)[\s:]+([^\n]+)/i);
  if (countryMatch) {
    result.country = countryMatch[1].trim().slice(0, 80);
  }

  // Nombre del plan: título comercial del tour, NO el destino/país. Priorizar etiquetas explícitas.
  const planNameMatch = text.match(/(?:nombre\s+del\s+plan|plan|tour|título|titulo|itinerario)[\s:]+([^\n]+)/i);
  if (planNameMatch) {
    const candidate = planNameMatch[1].trim().slice(0, 120);
    // No usar como nombre si es solo un país conocido
    const knownCountries = ["Turquía", "Egipto", "Dubai", "Perú", "Italia", "España", "Finlandia", "Vietnam", "Tailandia", "Colombia", "Emiratos"];
    if (!knownCountries.some((c) => candidate.toLowerCase() === c.toLowerCase())) {
      result.name = candidate;
    }
  }
  if (!result.name) {
    const titleMatch = text.match(/^([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñ\s\-0-9]+(?:Esencial|Completo|Turístico|Aventura|Tour|Peregrinación|Maravilloso|días?))\s*[\n\r]/i);
    if (titleMatch) {
      const candidate = titleMatch[1].trim().slice(0, 120);
      const knownCountries = ["Turquía", "Egipto", "Dubai", "Perú", "Italia", "España", "Finlandia", "Vietnam", "Tailandia", "Colombia", "Emiratos"];
      if (!knownCountries.some((c) => candidate.toLowerCase() === c.toLowerCase())) {
        result.name = candidate;
      }
    }
  }
  if (!result.name && lines[0] && lines[0].length > 5 && lines[0].length < 80) {
    const knownCountries = ["Turquía", "Egipto", "Dubai", "Perú", "Italia", "España", "Finlandia", "Vietnam", "Tailandia", "Colombia", "Emiratos"];
    if (!knownCountries.some((c) => lines[0].toLowerCase() === c.toLowerCase())) {
      result.name = lines[0];
    }
  }

  // Si aún no hay país, deducirlo del nombre del plan (ej. "Perú Esencial" → country = Perú)
  if (!result.country && result.name) {
    const knownCountries = ["Turquía", "Egipto", "Dubai", "Perú", "Italia", "España", "Finlandia", "Vietnam", "Tailandia", "Colombia", "Emiratos"];
    for (const c of knownCountries) {
      if (result.name.toLowerCase().includes(c.toLowerCase())) {
        result.country = c;
        break;
      }
    }
  }

  // Duración y noches: "8 días", "7 noches", "8D/7N"
  const daysMatch = text.match(/(\d+)\s*(?:días|dias|d)/i) || text.match(/(\d+)D(?:\/|\s|$)/i);
  const nightsMatch = text.match(/(\d+)\s*(?:noches|noche)/i) || text.match(/(\d+)N(?:\/|\s|$)/i);
  if (daysMatch) result.duration = Math.min(99, parseInt(daysMatch[1], 10) || 1);
  if (nightsMatch) result.nights = Math.min(99, parseInt(nightsMatch[1], 10) || 0);
  if (result.duration > 0 && result.nights === 0) result.nights = Math.max(0, result.duration - 1);

  // Precio: USD 1599, $1599, precio desde
  const priceMatch = text.match(/(?:USD|usd|\$)\s*(\d[\d,\s]*\d|\d+)/) ||
    text.match(/(?:precio|desde)[\s:]*(?:USD\s*)?(\d[\d,\s]*\d|\d+)/i);
  if (priceMatch) {
    result.basePrice = priceMatch[1].replace(/[\s,]/g, "");
  }

  // Descripción: párrafo después del nombre o antes de INCLUYE
  const beforeIncl = text.split(/(?:INCLUYE|incluye|incluido)/i)[0];
  const para = beforeIncl.split(/\n\n+/).find((p) => p.length > 40 && !/^\s*(día|day)\s*\d/i.test(p));
  if (para) {
    result.description = para.trim().slice(0, 1000);
  }

  // Inclusiones
  const inclSection = text.match(/(?:INCLUYE|incluye|incluido|incluye:)\s*([\s\S]*?)(?=\n\s*(?:no\s+incluye|excluye|exclusiones|día|day|hotel|itinerario)|$)/i);
  if (inclSection) {
    const items = inclSection[1]
      .split(/[\n•\-\*]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 300);
    result.inclusions = items.map((item) => ({ item }));
  }

  // Exclusiones
  const exclSection = text.match(/(?:no\s+incluye|excluye|exclusiones|no incluye:)\s*([\s\S]*?)(?=\n\s*(?:día|day|hotel|itinerario|precio)|$)/i);
  if (exclSection) {
    const items = exclSection[1]
      .split(/[\n•\-\*]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 2 && s.length < 300);
    result.exclusions = items.map((item) => ({ item }));
  }

  // Días del itinerario (extraer actividades con horarios si existen)
  const dayBlocks = text.split(/(?=día\s*\d|day\s*\d)/i);
  for (let i = 1; i < dayBlocks.length; i++) {
    const block = dayBlocks[i];
    const dayNumMatch = block.match(/^(?:día|day)\s*(\d+)/i);
    const dayNum = dayNumMatch ? parseInt(dayNumMatch[1], 10) : i;
    const titleMatch = block.match(/^(?:día|day)\s*\d+\s*[-–—:]*\s*([^\n]+)/i);
    const title = titleMatch ? titleMatch[1].trim() : `Día ${dayNum}`;
    const locMatch = block.match(/(?:ubicación|ubicacion|location|lugar)[\s:]+([^\n]+)/i);
    const location = locMatch ? locMatch[1].trim() : undefined;
    const descMatch = block.match(/(?:descripción|descripcion|contenido)[\s:]*\n?([\s\S]*?)(?=\n\s*(?:comidas|alojamiento|ubicación)|$)/i);
    let description = descMatch ? descMatch[1].trim() : block.slice(0, 800).trim();
    const mealsMatch = block.match(/(?:comidas|almuerzo|desayuno|cena)[\s:]*([^\n]+)/i);
    const meals = mealsMatch
      ? mealsMatch[1].split(/[,;]/).map((m) => m.trim()).filter(Boolean)
      : undefined;
    const accMatch = block.match(/(?:alojamiento|hotel|accommodation)[\s:]*([^\n]+)/i);
    const accommodation = accMatch ? accMatch[1].trim() : undefined;
    const lines = description.split(/\n/).map((l) => l.trim()).filter(Boolean);
    const withTimes = lines.filter((l) => /^\d{1,2}[:\s]\d{2}/.test(l) || /^\*\*\d{1,2}[:\s]\d{2}/.test(l));
    if (withTimes.length >= 1) {
      description = withTimes
        .map((l) => l.replace(/^\*\*|\*\*$/g, "").replace(/\*\*:\s*/, ": "))
        .join("\n");
    }
    if (description.length > 20 || title !== `Día ${dayNum}`) {
      result.itinerary.push({
        dayNumber: dayNum,
        title,
        location,
        description: description || "-",
        meals,
        accommodation,
      });
    }
  }

  // Hoteles (normalizar categoría a 3*, 4*, 5*)
  const hotelSection = text.match(/(?:hoteles|hotel|alojamientos)\s*[\s:]*([\s\S]*?)(?=\n\s*(?:itinerario|día|day|precio)|$)/i);
  if (hotelSection) {
    const hotelLines = hotelSection[1].split(/\n/).filter((l) => l.trim().length > 5);
    for (const line of hotelLines) {
      const m = line.match(/[-•]?\s*(.+?)(?:\s*,|\s+)\s*(\d\*|\d\s*estrellas?|three\s*stars?|four\s*stars?|five\s*stars?)?(?:\s*,|\s+)?\s*([^,]+)?(?:\s*,|\s+)?\s*(\d+)\s*noches?/i)
        || line.match(/[-•]?\s*(.+?)(?:\s+-\s*)([^-\n]+)/);
      if (m) {
        const name = m[1].trim();
        const category = normalizeHotelCategory(m[2]?.trim());
        const location = m[3]?.trim();
        const nights = m[4] ? parseInt(m[4], 10) : undefined;
        if (name.length > 2) {
          result.hotels.push({ name, category, location, nights });
        }
      } else if (line.trim().length > 10) {
        result.hotels.push({ name: line.trim().slice(0, 120) });
      }
    }
  }

  return result;
}

/** Intenta extraer con OpenAI si la API key está configurada */
export async function extractPlanWithAI(rawText: string): Promise<ExtractedPlan | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    // Dynamic import para no fallar si no hay openai instalado
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });
    const schema = `{
  "name": "string",
  "country": "string",
  "duration": number,
  "nights": number,
  "description": "string",
  "basePrice": "string (solo números)",
  "itinerary": [{ "dayNumber": number, "title": "string", "location": "string?", "description": "string", "activities": ["string"]?, "meals": ["string"]?, "accommodation": "string?" }],
  "hotels": [{ "name": "string", "category": "string?", "location": "string?", "nights": number? }],
  "inclusions": [{ "item": "string" }],
  "exclusions": [{ "item": "string" }],
  "priceTiers": [{ "startDate": "YYYY-MM-DD?", "endDate": "YYYY-MM-DD", "price": "string" }],
  "upgrades": [{ "code": "string", "name": "string", "description": "string?", "price": number }]
}`;
    const systemPrompt = `Eres un asistente que extrae información de itinerarios de viaje. 
Devuelves ÚNICAMENTE un JSON válido con esta estructura, sin markdown ni texto extra:
${schema}

Reglas:
- name y country en español. basePrice solo números. itinerary ordenado por dayNumber.
- Si no encuentras algo, usa "" o [] según el tipo. duration y nights son números enteros.

NOMBRE DEL PLAN vs DESTINO/PAÍS (MUY IMPORTANTE):
- **name** = nombre comercial del plan/tour, NO el país ni el destino. Ejemplos: "Tour El Cairo Maravilloso", "Tour de Peregrinación de Cuatro Días", "Perú Esencial 7 Días", "Turquía Completa 10 días".
- **country** = país o destino principal. Ejemplos: "Egipto", "Perú", "Turquía", "Emiratos", "Italia".
- Si el documento tiene un título como "Tour El Cairo Maravilloso" y también dice "Destino: Egipto", entonces name = "Tour El Cairo Maravilloso" y country = "Egipto".
- NUNCA pongas solo el país en name (ej. "Egipto" como name es INCORRECTO). El name debe ser el título del plan/tour.

DESCRIPCIÓN DEL PLAN (campo "description"):
- NO copies la descripción del documento. COSMO la GENERA.
- Escribe una descripción vendedora de MÁXIMO 3 líneas (~120-180 caracteres).
- Debe invitar a viajar: destaca lo mejor, sensaciones, experiencias únicas del plan.
- Objetivo: que quien la lea piense "¡quiero vivir eso!". Ejemplo: "Descubre Capadocia desde el cielo en globo y recorre las ruinas de Éfeso. Noches en hoteles 5* con cenas incluidas. Una aventura que recordarás para siempre."

ITINERARIO - Resumen vs Detalle (el PDF exporta dos vistas):
- **title** = RESUMEN: breve, centrado en ubicación. Formato "Ciudad" o "Ciudad A - Ciudad B". Usado en la hoja 2 del PDF (timeline de ciudades). Ej: "Estambul", "Capadocia - Pamukkale", "Llegada a Lima".
- **description** = DETALLE: contenido completo para la hoja "Itinerario Detallado". Actividades con horarios, una por línea.
- Si el documento tiene itinerario resumido Y detallado, usa el resumido para title y el detallado para description.

ITINERARIO - Actividades con horarios:
- Si el documento tiene actividades con horarios (ej: 08:50, 9:30 AM, 14:00 hrs), extrae CADA actividad con su hora en "activities" como: "HH:MM - Descripción" (ej: "08:50 - Recojo en hotel").
- En description: une las activities con \\n para que cada actividad quede en una línea (description = activities.join("\\n")).
- Si no hay horarios, description puede ser párrafo normal y activities vacío o con ítems sin hora.

HOTELES - Categoría:
- category debe ser solo el número con asterisco: "3*", "4*", "5*".
- Si el doc dice "three stars", "3 stars", "tres estrellas", "3 estrellas" → usa "3*".
- Si dice "four stars", "4 stars", "cuatro estrellas" → "4*". Igual para 5.`;
    const userPrompt = `Extrae la información del siguiente documento de plan de viaje y devuelve el JSON:\n\n${rawText.slice(0, 28000)}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const content = response.choices[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as ExtractedPlan;
    return normalizeExtractedPlan(parsed);
  } catch {
    return null;
  }
}

/** Normaliza categoría de hotel: "three stars" → "3*", "3 estrellas" → "3*" */
function normalizeHotelCategory(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const s = raw.trim().toLowerCase();
  if (/(?:three|tres|3)\s*(?:stars?|estrellas?)/i.test(s) || s === "3*" || s === "3") return "3*";
  if (/(?:four|cuatro|4)\s*(?:stars?|estrellas?)/i.test(s) || s === "4*" || s === "4") return "4*";
  if (/(?:five|cinco|5)\s*(?:stars?|estrellas?)/i.test(s) || s === "5*" || s === "5") return "5*";
  const numMatch = s.match(/(\d)\s*(?:estrellas?|stars?|\*)?/i) || s.match(/^(\d)\*?$/);
  return numMatch ? `${numMatch[1]}*` : raw.slice(0, 20);
}

function normalizeExtractedPlan(p: Partial<ExtractedPlan>): ExtractedPlan {
  return {
    name: String(p?.name ?? "").slice(0, 120),
    country: String(p?.country ?? "").slice(0, 80),
    duration: Math.max(1, Math.min(99, Number(p?.duration) || 1)),
    nights: Math.max(0, Math.min(99, Number(p?.nights) ?? 0)),
    description: String(p?.description ?? "").slice(0, 300).trim(),
    basePrice: String(p?.basePrice ?? "").replace(/\D/g, "").slice(0, 10) || "",
    itinerary: Array.isArray(p?.itinerary)
      ? p.itinerary.map((d, i) => {
          const activities = Array.isArray(d?.activities)
            ? d.activities.map((a) => String(a ?? "").trim()).filter(Boolean)
            : undefined;
          const desc = String(d?.description ?? "").trim();
          const finalDesc =
            activities?.length && activities.some((a) => /\d{1,2}[:\h]\d{2}/.test(a))
              ? activities.join("\n")
              : desc || (activities?.join("\n") ?? "");
          return {
            dayNumber: d.dayNumber ?? i + 1,
            title: String(d.title ?? "").slice(0, 200),
            location: d.location ? String(d.location).slice(0, 100) : undefined,
            description: finalDesc.slice(0, 3000),
            activities,
            meals: Array.isArray(d.meals) ? d.meals : undefined,
            accommodation: d.accommodation ? String(d.accommodation).slice(0, 200) : undefined,
          };
        })
      : [],
    hotels: Array.isArray(p?.hotels)
      ? p.hotels.map((h) => ({
          name: String(h.name ?? "").slice(0, 120),
          category: normalizeHotelCategory(h.category),
          location: h.location ? String(h.location).slice(0, 80) : undefined,
          nights: typeof h.nights === "number" ? h.nights : undefined,
        }))
      : [],
    inclusions: Array.isArray(p?.inclusions)
      ? p.inclusions.map((x) => ({ item: String(x?.item ?? "").slice(0, 300) })).filter((x) => x.item)
      : [],
    exclusions: Array.isArray(p?.exclusions)
      ? p.exclusions.map((x) => ({ item: String(x?.item ?? "").slice(0, 300) })).filter((x) => x.item)
      : [],
    priceTiers: Array.isArray(p?.priceTiers)
      ? p.priceTiers.map((t) => ({
          startDate: t.startDate,
          endDate: String(t.endDate ?? ""),
          price: String(t.price ?? ""),
          isFlightDay: t.isFlightDay,
          flightLabel: t.flightLabel,
        }))
      : [],
    upgrades: Array.isArray(p?.upgrades)
      ? p.upgrades.map((u) => ({
          code: String(u.code ?? "").slice(0, 30),
          name: String(u.name ?? "").slice(0, 100),
          description: u.description ? String(u.description).slice(0, 200) : undefined,
          price: Number(u.price) || 0,
        }))
      : [],
  };
}
