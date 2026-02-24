/**
 * Script para poblar los campos de PDF de los planes existentes con los valores
 * que actualmente usa el generador de PDF como fallback (lógica legacy).
 *
 * Esto permite que al editar un plan en el admin (ej: Turquía Esencial), el
 * formulario muestre los comentarios, términos y condiciones que ya aparecen
 * en el PDF, para que puedan ser editados.
 *
 * Ejecutar: npx tsx scripts/populate-plan-pdf-fields.ts
 */

import "dotenv/config";
import { db } from "../server/db";
import { destinations } from "../shared/schema";
import { eq } from "drizzle-orm";

// Valores extraídos de publicPdfGenerator.ts (lógica legacy)

const TURQUIA_ESENCIAL_FIRST_PAGE_COMMENTS = `Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guía de habla hispana. Recuerda consultar los servicios no incluidos. **Globo Turquia +415usd por persona / 6 almuerzos +200usd por persona / Tarifa aérea NO reembolsable, permite cambio con penalidades + diferencia de tarifa.** NOCHE ADICIONAL DE HOTEL CON DESAYUNO EN ESTAMBUL + 250USD EN HOTELES DE LA MISMA CATEGORIA.`;

const DEFAULT_FIRST_PAGE_COMMENTS = `Tarifa sujeta a cambios sin previo aviso y disponibilidad. Para el destino, cuenta con acompañamiento de guia de habla hispana.  Recuerda consultar los servicios no incluidos. **Tarifa aérea NO reembolsable, permite cambio con penalidades + diferencia de tarifa.** NOCHE ADICIONAL APLICA SUPLEMENTO A TRANSFER`;

const DEFAULT_TERMS_CONDITIONS = `Servicios: Cambios en el itinerario posibles según condiciones y disponibilidad del guía. Hotelería: Alojamiento en hoteles de primera entre 4 y 5 estrellas similares a los planificados. Excursiones: No reembolsos por inasistencias. Traslados: Recogida y salida sin acceso al aeropuerto. Espera máxima de 2 horas tras aterrizaje. Documentación: Colombianos exentos de visado. Pasaporte con mínimo 6 meses de validez. Consultar requerimientos para otras nacionalidades.`;

const DEFAULT_FLIGHT_TERMS = `Los boletos de avión no son reembolsables.

Una vez emitido el boleto no puede ser asignado a una persona o aerolínea diferente.

Los cambios en los boletos pueden ocasionar cargos extra, están sujetos a disponibilidad, clase tarifaria y políticas de cada aerolínea al momento de solicitar el cambio.

Para vuelos nacionales presentarse 2 horas antes de la salida del vuelo. Para vuelos internacionales presentarse 3 horas antes de la salida del vuelo.`;

function isTurquiaEsencial(name: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("turquía esencial") || n.includes("turquia esencial");
}

function isTurkeyPlan(name: string | null, country: string | null): boolean {
  if (!name && !country) return false;
  const n = (name || "").toLowerCase();
  const c = (country || "").toLowerCase();
  return n.includes("turquía") || n.includes("turquia") || c.includes("turkey");
}

async function main() {
  console.log("Poblando campos de PDF en planes existentes...\n");

  const allDestinations = await db.select().from(destinations);
  let updated = 0;

  for (const dest of allDestinations) {
    const updates: Record<string, string | null> = {};
    const name = dest.name ?? "";
    const country = dest.country ?? "";

    // first_page_comments: usar valor específico para Turquía Esencial o default
    if (!dest.firstPageComments?.trim()) {
      updates.firstPageComments = isTurquiaEsencial(name)
        ? TURQUIA_ESENCIAL_FIRST_PAGE_COMMENTS
        : DEFAULT_FIRST_PAGE_COMMENTS;
    }

    // terms_conditions: default para todos si está vacío
    if (!dest.termsConditions?.trim()) {
      updates.termsConditions = DEFAULT_TERMS_CONDITIONS;
    }

    // flight_terms: default para todos si está vacío
    if (!dest.flightTerms?.trim()) {
      updates.flightTerms = DEFAULT_FLIGHT_TERMS;
    }

    // itinerary_map_image_url: para planes de Turquía, usar mapa de Supabase si está vacío
    if (!dest.itineraryMapImageUrl?.trim() && isTurkeyPlan(name, country)) {
      const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
      if (supabaseUrl) {
        updates.itineraryMapImageUrl = `${supabaseUrl}/storage/v1/object/public/plan-turquia-esencial/mapa-itinerario.png`;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db
        .update(destinations)
        .set(updates as any)
        .where(eq(destinations.id, dest.id));
      updated++;
      console.log(`  ✓ ${name} (${country}): ${Object.keys(updates).join(", ")}`);
    }
  }

  console.log(`\nListo. ${updated} plan(es) actualizado(s) de ${allDestinations.length} total.`);
  console.log("\nNota: medical_assistance_image_url se deja vacío cuando no hay valor.");
  console.log("El PDF usa 'medical-assistance.png' por defecto. Puedes subir una imagen");
  console.log("personalizada desde el formulario de edición del plan.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
