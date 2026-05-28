import type { Destination } from "@shared/schema";

/** Texto del tooltip de tarjeta: prioriza cardTooltip de BD; si no hay, usa reglas por defecto. */
export function getPlanCardTooltip(dest: Destination, catalog: Destination[] = []): string {
  const custom = dest.cardTooltip?.trim();
  if (custom) return custom;
  return getPlanCardTooltipFallback(dest, catalog);
}

function getPlanCardTooltipFallback(dest: Destination, catalog: Destination[]): string {
  if (dest.name === "Lo Mejor de Cusco + Lima") {
    return "Salidas diarias, programa incluye todas las actividades de interes para los dias de viaje. Cualquier cambio, bajo solicitud. Incluye impuestos. Acompañamiento de guia, solo en actividades. Requiere vuelos internos para el 4to dia; se recomienda sea antes de las 07:00am, tienen incluida actividad el primer dia de llegada a CUZ.";
  }

  if (
    dest.country === "Perú" ||
    dest.name.includes("Cusco") ||
    dest.name.includes("Perú") ||
    dest.name.includes("Lima") ||
    dest.name.includes("Machu Picchu") ||
    dest.name.includes("Paracas") ||
    dest.name.includes("Nazca") ||
    dest.name.includes("Huacachina")
  ) {
    return "Salidas diarias, programa incluye todas las actividades de interes para los dias de viaje. Cualquier cambio, bajo solicitud. Incluye impuestos. Acompañamiento de guia, solo en actividades. No requiere vuelos internos";
  }

  if (dest.name === "DUBAI Maravilloso") {
    return "Salidas diarias desde 2 pax. Combinalo facil. Tarifa dinamica. Plan no requiere mejoras. Impuestos no incluidos. Acompañamiento de guia durante todo el recorrido";
  }

  if (dest.name === "Auroras boreales finlandia") {
    return "Salidas diarias desde 2 pax. Programa se sugiere combinar con Madrid o Paris al inicio y/o final del viaje. Impuestos incluidos. Acompañamiento de guia, solo en las actividades. Permite mejoras o cambios, bajo solicitud. Temporada de auroras de diciembre a marzo";
  }

  if (dest.name === "Egipto (Con Crucero) + Emiratos Árabes") {
    return "Fechas puntuales (revisar disponibilidad). Programa combinado con vuelos internos incluidos en EGIPTO (El Cairo- Aswan/ Luxor- El Cairo en clase turista). Guia acompañante durante recorrido en El Cairo - Dubai. Programa no requeire mejoras";
  }

  if (dest.name === "Gran Tour de Europa") {
    return "Salidas dias lunes (revisar disponibilidad). Programa circuito con acompañamiento de guia durante todo el recorrido. Inicia en MAD - termina en MAD. Programa permite incluir mejoras (actividades opcionales no incluidas)";
  }

  if (dest.name === "Italia Turística - Euro Express") {
    return "Salidas dias viernes (validar disponibilidad) Programa circuito con acompañamiento de guia de habla hispana, durante todo el recorrido. Programa inicia en Roma y termina en Milán. Programa APLICA para mejoras";
  }

  if (dest.name === "España e Italia Turística - Euro Express") {
    return "Salidas dias lunes (validar disponibilidad) Programa circuito con acompañamiento de guia de habla hispana durante todo el recorrido. Programa inicia en Madrid y termina en Milan.  Programa NO requiere mejoras.";
  }

  if (dest.name === "Turquía Esencial") {
    return "Salidas todos los miércoles del año. Sabados entre marzo a nov 2026. Si vendes con vuelo, debes cotizar salida los martes y viernes desde Colombia. Programa terrestre con acompañamiento de guía habla hispana en destino. No incluye impuestos.";
  }

  if (dest.country?.toLowerCase().includes("turquía") || dest.country?.toLowerCase().includes("turquia")) {
    const otherCountries = Array.from(
      new Set(
        catalog
          .filter((d) => d.category === "internacional" && d.country !== dest.country && d.country !== "Colombia")
          .map((d) => d.country)
      )
    ).join(", ");

    return `Salidas todos los Martes desde Colombia. Combinable con: ${otherCountries || "otros destinos"} (salidas diarias). Turquía siempre va primero en la ruta.`;
  }

  return "Salidas diarias. Combinable con todos los destinos. Si combinas con Turquía, ten en cuenta que Turquía tiene salidas los Martes desde Colombia y será el primer destino en tu ruta.";
}
