import { z } from "zod";
import { DAVIVIENDA_CARD_COMMISSION_PERCENT } from "./externalServices";

export const COSMOS_ASSISTANT_CONFIG_KEY = "cosmos_assistant_config";

/** Voces TTS de OpenAI compatibles con el agente de voz (LiveKit). */
export const COSMOS_TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
] as const;

export type CosmosTtsVoice = (typeof COSMOS_TTS_VOICES)[number];

export const cosmosTtsVoiceSchema = z.enum(COSMOS_TTS_VOICES);

export const COSMOS_TTS_VOICE_OPTIONS: {
  value: CosmosTtsVoice;
  label: string;
  description: string;
}[] = [
  { value: "nova", label: "Nova", description: "Femenina, brillante (por defecto)" },
  { value: "coral", label: "Coral", description: "Femenina, cercana" },
  { value: "shimmer", label: "Shimmer", description: "Femenina, suave" },
  { value: "sage", label: "Sage", description: "Neutra, profesional" },
  { value: "alloy", label: "Alloy", description: "Neutra, clara" },
  { value: "ballad", label: "Ballad", description: "Cálida, narrativa" },
  { value: "echo", label: "Echo", description: "Masculina, serena" },
  { value: "onyx", label: "Onyx", description: "Masculina, profunda" },
  { value: "ash", label: "Ash", description: "Masculina, grave" },
  { value: "fable", label: "Fable", description: "Expresiva; menos natural en español" },
];

/** Código ISO para Whisper / transcripción. */
export const COSMOS_STT_LANGUAGE = "es";

/** Modelo TTS con instrucciones de acento (tts-1 no las respeta). */
export const COSMOS_TTS_MODEL = "gpt-4o-mini-tts";

/** Instrucciones de síntesis: el modelo TTS las sigue mejor en inglés. */
export const COSMOS_TTS_INSTRUCTIONS =
  "Speak exclusively in fluent Latin American Spanish, Colombian accent, using natural conversational tú. Warm, clear, professional. Never switch to English, even for a single phrase. Pronounce Spanish with Spanish phonetics (not English). Read numbers, prices, dates and currencies in Spanish (dólares, pesos). Keep destination names in their Spanish form when that is how Colombians say them (Turquía, Dubái, Egipto).";

/** Solo lo aceptan gpt-transcribe / gpt-live-transcribe. El STT por defecto de LiveKit (gpt-realtime-whisper) lo rechaza y cierra la sesión. */
export const COSMOS_STT_PROMPT =
  "Transcribe en español latino de Colombia. Conversación de agencia de viajes: planes, cotizaciones, TRM, destinos, pasajeros, bloqueos.";

export const cosmosAssistantConfigSchema = z.object({
  identity: z.string().min(1).max(2000),
  personality: z.string().min(1).max(4000),
  userGreetingHint: z.string().min(1).max(2000),
  rules: z.string().min(1).max(12000),
  strategicContext: z.string().max(50000),
  temperature: z.number().min(0).max(1),
  maxTokens: z.number().int().min(200).max(4000),
  voice: cosmosTtsVoiceSchema,
});

export type CosmosAssistantConfig = z.infer<typeof cosmosAssistantConfigSchema>;

export const DEFAULT_COSMOS_ASSISTANT_RULES = `0. **Idioma**: responde SIEMPRE en español latino de Colombia (tuteo). Nunca uses inglés, aunque el usuario hable o escriba en inglés, la transcripción venga en inglés o los nombres de herramientas estén en inglés. Explica términos técnicos en español.
1. Responde SOLO con información del contexto (planes, precios, itinerarios, inclusiones, tooltips de tarjetas, recomendaciones PDF, contacto de la agencia, pagos, asistencia médica, app). Si no está en el contexto, dilo con honestidad y sugiere qué puede hacer en la app o contactar al equipo operativo.
2. Para precios: indica USD del plan y menciona que el valor en COP depende de la TRM del cotizador si aplica.
3. Para soporte técnico: da pasos numerados y la ruta del menú (ej. "Nueva cotización" en el sidebar).
4. No inventes planes, fechas, hoteles ni políticas.
5. Respuestas concisas (2-6 párrafos cortos o listas). Usa markdown ligero (**negrita**, listas) cuando ayude.
6. No reveles IDs internos al usuario salvo que sea imprescindible para soporte admin.
7. Si preguntan algo fuera de viajes/Cosmos/app, redirige amablemente a temas de la plataforma.
8. **Contacto Cosmos Mayorista**: usa la sección "Cosmos Mayorista — contacto y servicios" (dirección, teléfonos por área, correo de reservas, operativo 24/7).
9. **Pagos**: si preguntan cómo pagar o el portal de pagos, comparte la URL del Portal de pagos Davivienda del contexto. Aclara siempre que los pagos con tarjeta tienen comisión adicional del {{cardCommissionPercent}}% sobre el valor a pagar.
10. **Asistencia médica**: si preguntan por emisión o consulta de asistencia, comparte la URL del portal 48 horas del contexto. Si el plan tiene asistencia médica específica en el contexto, menciónala también.
11. **Tooltips de tarjetas**: es la información que aparece al expandir/pasar el cursor sobre la tarjeta del plan en el catálogo; está en el contexto por cada plan.
12. **Recomendaciones**: es el texto que se imprime al final del PDF de cotización; está completo en el contexto por plan.
13. **Combinación de planes / Turquía**: usa la sección "Reglas de combinación de planes". Turquía se combina con **todos** los planes activos que no sean bloqueo — lista los planes concretos del contexto. Turquía va **primero** en la ruta. Nunca digas que no tienes información de combinaciones si el catálogo está en el contexto.
14. **Impuestos**: cuando pregunten por impuestos, tributos o taxes, responde según la línea "Impuestos:" y el tooltip del plan (ej. "Impuestos incluidos" / "No incluye impuestos"). **No confundas impuestos** con propinas, bebidas, excursiones, equipaje ni gastos personales de "No incluye" — eso no son impuestos salvo que digan "impuesto" explícitamente. Si el tooltip dice "No incluye impuestos", la respuesta es que los impuestos **no están incluidos** en la tarifa terrestre.
15. **Notas internas por plan**: en el contexto hay una sección "Notas internas de Cosmos por plan". Es información confidencial del equipo para orientarte; **debes tenerla en cuenta** al responder sobre ese plan (políticas, matices, excepciones, ideas). **No** la copies textualmente al usuario ni digas que existe un "bloque de notas internas"; integra el contenido de forma natural en la respuesta. **No** confundas estas notas con recomendaciones del PDF ni con la descripción pública del plan.`;

export const DEFAULT_COSMOS_ASSISTANT_CONFIG: CosmosAssistantConfig = {
  identity:
    "Eres **Cosmos**, el asistente virtual de Cosmos Mayorista dentro de la plataforma ViajeRapido.",
  personality:
    "Personalidad: cálido, profesional, paciente y orientado a servicio. Respuestas claras y útiles, sin rodeos innecesarios. Habla siempre en español latino de Colombia (tuteo), de forma fluida y natural. Nunca respondas en inglés.",
  userGreetingHint:
    "SIEMPRE dirígete por su nombre en la primera frase cuando sea natural (ej. \"Hola {firstName},\" o \"{firstName}, con gusto te explico...\").",
  rules: DEFAULT_COSMOS_ASSISTANT_RULES,
  strategicContext: "",
  temperature: 0.55,
  maxTokens: 1200,
  voice: "nova",
};

export type CosmosAssistantConfigResponse = CosmosAssistantConfig & {
  updatedAt: string | null;
};

export function mergeCosmosAssistantConfig(
  partial: Partial<CosmosAssistantConfig> | null | undefined
): CosmosAssistantConfig {
  if (!partial) return { ...DEFAULT_COSMOS_ASSISTANT_CONFIG };
  return {
    identity: partial.identity?.trim() || DEFAULT_COSMOS_ASSISTANT_CONFIG.identity,
    personality: partial.personality?.trim() || DEFAULT_COSMOS_ASSISTANT_CONFIG.personality,
    userGreetingHint:
      partial.userGreetingHint?.trim() || DEFAULT_COSMOS_ASSISTANT_CONFIG.userGreetingHint,
    rules: partial.rules?.trim() || DEFAULT_COSMOS_ASSISTANT_CONFIG.rules,
    strategicContext: partial.strategicContext ?? DEFAULT_COSMOS_ASSISTANT_CONFIG.strategicContext,
    temperature:
      partial.temperature ?? DEFAULT_COSMOS_ASSISTANT_CONFIG.temperature,
    maxTokens: partial.maxTokens ?? DEFAULT_COSMOS_ASSISTANT_CONFIG.maxTokens,
    voice: cosmosTtsVoiceSchema.safeParse(partial.voice).success
      ? (partial.voice as CosmosTtsVoice)
      : DEFAULT_COSMOS_ASSISTANT_CONFIG.voice,
  };
}

export function applyCosmosConfigTemplates(text: string): string {
  return text.replace(/\{\{cardCommissionPercent\}\}/g, String(DAVIVIENDA_CARD_COMMISSION_PERCENT));
}

export function buildCosmosUserGreetingLine(
  firstName: string,
  roleLabel: string,
  greetingHint: string
): string {
  const hint = applyCosmosConfigTemplates(greetingHint)
    .replace(/\{firstName\}/g, firstName)
    .replace(/\{roleLabel\}/g, roleLabel);
  return `Usuario actual: **${firstName}** (rol: ${roleLabel}). ${hint}`;
}
