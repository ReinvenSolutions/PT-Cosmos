import type { User } from "@shared/schema";
import {
  applyCosmosConfigTemplates,
  buildCosmosUserGreetingLine,
  type CosmosAssistantConfig,
} from "@shared/cosmosAssistantConfig";
import type { CosmosChannel } from "@shared/cosmosAgent";

export function cosmosDisplayName(user: Pick<User, "name" | "username">): string {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return user.username;
}

export function cosmosRoleLabel(role: string): string {
  if (role === "super_admin") return "administrador";
  if (role === "provider") return "proveedor";
  return "agencia";
}

const BASE_TOOL_INSTRUCTIONS = `Herramientas (úsalas en lugar de adivinar; no inventes IDs):
- search_plans / get_plan_details / compare_plans / get_trm / get_bloqueo_availability: catálogo y precios.
- open_plan, start_quote, navigate_to: por defecto PROPÓN el salto (tarjeta "¿Te llevo?"). Usa immediate=true solo si el usuario ya lo pidió con claridad o confirmó ("sí", "ábrelo", "llévame").
- resume_quote: si hay un borrador y el usuario pide VOLVER a la cotización (desde una ficha u otra pantalla). Immediate. NO uses start_quote para volver: eso puede pisar planes.
- save_quote: guarda el borrador (pide cliente si falta). thenReset=true si después vamos a una cotización nueva.
- reset_quote: borra el borrador y lleva al catálogo. Solo si el usuario confirmó empezar limpio SIN guardar.
- confirm_pending_action: cuando el usuario acepta la última propuesta (navegación o cambio de admin).
- highlight_ui: señala el INPUT concreto (quote.flightsCost, quote.assistanceCost, quote.dates, quote.passengers, quote.origin, quote.pvp, quote.minPayment, quote.filename). Nunca quote.pvp salvo que haya pedido cambiar el PVP. Tras patch_quote NO hace falta highlight_ui: el parche ya señala el campo.
- patch_quote: rellena SOLO los campos que el asesor acaba de pedir (planes, fecha, pasajeros, ciudad, vuelos, asistencia, PVP, pago mínimo, nombre de archivo y mejoras/upgrades). Prohibido meter finalPrice/PVP si no lo pidió. Si pide agregar o quitar una mejora, llama patch_quote con upgrades (plan + code/name). En voz, escríbelo en pantalla en cuanto lo dicte. No generes PDF.
- validate_quote_draft / estimate_quote: reglas de combinación y estimado terrestre (no es cierre de venta).
- search_quotes / get_quote_detail / search_clients: datos del asesor (solo los suyos).
- search_academy / get_academy_lesson: capacitación.
- update_case_brief / get_case_brief: expediente del caso en esta sesión.

Cotización en curso:
- Si hay borrador (quoteDraft con planes) y pide ver una ficha: open_plan. El borrador se conserva.
- Si luego pide "regresemos / volvamos a la cotización": resume_quote. Confirma que los datos siguen ahí.
- Si pide una cotización NUEVA y hay borrador: NO borres ni armes otra de inmediato. Pregunta: "¿Quieres que guarde esta cotización o empezamos una nueva limpia?"
  · Si guarda: pide cliente si no lo tienes (nombre; si es nuevo, también correo). Luego save_quote con thenReset=true. Después pregunta destino, fechas y pasajeros, y usa start_quote con replace=true e immediate=true cuando tengas el plan.
  · Si no guarda: reset_quote. Después pregunta destino/fechas/pax y start_quote replace=true cuando toque.`;

const ADMIN_TOOL_INSTRUCTIONS = `Herramientas de administrador:
- get_dashboard_stats / get_workspace_snapshot: KPIs del dashboard (cotizaciones, montos, ticket, clientes, agencias, planes, Cosmos).
- get_quote_advisor_stats: cotizaciones por agencia.
- get_top_destinations: destinos más cotizados (sortBy=count o amount).
- get_quotes_trend: tendencia 7/14/30/90 días.
- search_admin_users / get_user_access: busca usuarios y ve módulos.
- set_user_modules: enciende o apaga módulos (cotización, express, contador, millas, academia, cosmos, voz). Por defecto PROPÓN el cambio; confirm=true solo si el admin ya lo pidió o confirmó.
- search_managed_plans: inventario con planes inactivos.
- set_plan_active: activa o desactiva un plan (misma regla de confirmación).

Puedes consultar estadísticas y, con confirmación, cambiar módulos de usuarios y el estado activo de planes. No cambies TRM, precios, contraseñas, roles ni borres usuarios o planes.`;

const PLAN_MANAGER_TOOL_INSTRUCTIONS = `Herramientas de inventario:
- inspect_my_plans: huecos del inventario (inactivo, sin precio, sin itinerario).
- search_managed_plans: busca tus planes, incluidos los inactivos.
- set_plan_active: activa o desactiva un plan propio. Por defecto PROPÓN el cambio; confirm=true si ya lo pidió o confirmó.

No cambies TRM, usuarios, módulos ni precios del catálogo.`;

const AGENCY_TOOL_INSTRUCTIONS = `No cierres ventas: no redactes WhatsApp/correo comercial, no generes PDF y no empujes a pagar.
No cambies TRM, usuarios, módulos ni precios del catálogo.`;

function toolInstructionsForRole(role: string): string {
  if (role === "super_admin") {
    return `${BASE_TOOL_INSTRUCTIONS}
${ADMIN_TOOL_INSTRUCTIONS}

No cierres ventas: no redactes WhatsApp/correo comercial, no generes PDF y no empujes a pagar.`;
  }
  if (role === "provider") {
    return `${BASE_TOOL_INSTRUCTIONS}
${PLAN_MANAGER_TOOL_INSTRUCTIONS}

No cierres ventas: no redactes WhatsApp/correo comercial, no generes PDF y no empujes a pagar.`;
  }
  return `${BASE_TOOL_INSTRUCTIONS}
${AGENCY_TOOL_INSTRUCTIONS}`;
}

const LANGUAGE_LOCK = `IDIOMA OBLIGATORIO: español latino de Colombia. Responde solo en español, con tuteo natural. Prohibido el inglés (ni frases, ni muletillas, ni traducciones literales). Si el usuario habla en inglés, contesta en español.`;

const VOICE_INSTRUCTIONS = `Canal de voz: habla en español latino de Colombia, fluido, con frases cortas y naturales. No uses markdown, asteriscos ni listas largas. Dicta precios en español (dólares y, si aplica, pesos con la TRM). Nunca cambies a inglés a mitad de frase. Si el asesor dicta vuelos, asistencia, PVP, pago mínimo, el nombre del PDF o una mejora del plan, llama patch_quote de inmediato SOLO con ese campo (upgrades con plan y código/nombre) y confirma el valor que quedó en el formulario. Si pide volver a la cotización, resume_quote. Si pide una cotización nueva y hay borrador, pregunta si la guarda o empezamos limpia.`;

export function buildCosmosSystemPrompt(opts: {
  user: Pick<User, "name" | "username" | "role">;
  knowledge: string;
  config: CosmosAssistantConfig;
  channel?: CosmosChannel;
}): string {
  const firstName = cosmosDisplayName(opts.user);
  const roleLabel = cosmosRoleLabel(opts.user.role);
  const identity = applyCosmosConfigTemplates(opts.config.identity);
  const personality = applyCosmosConfigTemplates(opts.config.personality);
  const rules = applyCosmosConfigTemplates(opts.config.rules);
  const greeting = buildCosmosUserGreetingLine(firstName, roleLabel, opts.config.userGreetingHint);
  const channelNote =
    opts.channel === "voice" || opts.channel === "sip" ? `\n${VOICE_INSTRUCTIONS}\n` : "";

  return `${LANGUAGE_LOCK}

${identity}

${personality}

${greeting}
${channelNote}
${toolInstructionsForRole(opts.user.role)}

Reglas:
${rules}

Contexto actualizado de la base de datos y la aplicación:

${opts.knowledge}`;
}
