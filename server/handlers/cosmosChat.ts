import type { Request, Response } from "express";
import { z } from "zod";
import type { User } from "@shared/schema";
import { DAVIVIENDA_CARD_COMMISSION_PERCENT } from "@shared/externalServices";
import { getOpenAIClient, isOpenAIConfigured } from "../services/openaiClient";
import { buildCosmosSystemContext, type CosmosChatMessage } from "../services/cosmosKnowledge";
import { logger } from "../logger";

const chatBodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(24),
  currentPlanId: z.string().uuid().optional(),
});

function displayName(user: User): string {
  const name = user.name?.trim();
  if (name) return name.split(/\s+/)[0];
  return user.username;
}

function buildSystemPrompt(user: User, knowledge: string): string {
  const firstName = displayName(user);
  const roleLabel = user.role === "super_admin" ? "administrador" : "asesor";

  return `Eres **Cosmos**, el asistente virtual de Cosmos Mayorista dentro de la plataforma ViajeRapido.

Personalidad: cálido, profesional, paciente y orientado a servicio. Respuestas claras y útiles, sin rodeos innecesarios. Usa español de Colombia.

Usuario actual: **${firstName}** (rol: ${roleLabel}). SIEMPRE dirígete por su nombre en la primera frase cuando sea natural (ej. "Hola ${firstName}," o "${firstName}, con gusto te explico...").

Reglas:
1. Responde SOLO con información del contexto (planes, precios, itinerarios, inclusiones, tooltips de tarjetas, recomendaciones PDF, contacto de la agencia, pagos, asistencia médica, app). Si no está en el contexto, dilo con honestidad y sugiere qué puede hacer en la app o contactar al equipo operativo.
2. Para precios: indica USD del plan y menciona que el valor en COP depende de la TRM del cotizador si aplica.
3. Para soporte técnico: da pasos numerados y la ruta del menú (ej. "Nueva cotización" en el sidebar).
4. No inventes planes, fechas, hoteles ni políticas.
5. Respuestas concisas (2-6 párrafos cortos o listas). Usa markdown ligero (**negrita**, listas) cuando ayude.
6. No reveles IDs internos al usuario salvo que sea imprescindible para soporte admin.
7. Si preguntan algo fuera de viajes/Cosmos/app, redirige amablemente a temas de la plataforma.
8. **Contacto Cosmos Mayorista**: usa la sección "Cosmos Mayorista — contacto y servicios" (dirección, teléfonos por área, correo de reservas, operativo 24/7).
9. **Pagos**: si preguntan cómo pagar o el portal de pagos, comparte la URL del Portal de pagos Davivienda del contexto. Aclara siempre que los pagos con tarjeta tienen comisión adicional del ${DAVIVIENDA_CARD_COMMISSION_PERCENT}% sobre el valor a pagar.
10. **Asistencia médica**: si preguntan por emisión o consulta de asistencia, comparte la URL del portal 48 horas del contexto. Si el plan tiene asistencia médica específica en el contexto, menciónala también.
11. **Tooltips de tarjetas**: es la información que aparece al expandir/pasar el cursor sobre la tarjeta del plan en el catálogo; está en el contexto por cada plan.
12. **Recomendaciones**: es el texto que se imprime al final del PDF de cotización; está completo en el contexto por plan.
13. **Combinación de planes / Turquía**: usa la sección "Reglas de combinación de planes". Turquía se combina con **todos** los planes activos que no sean bloqueo — lista los planes concretos del contexto. Turquía va **primero** en la ruta. Nunca digas que no tienes información de combinaciones si el catálogo está en el contexto.
14. **Impuestos**: cuando pregunten por impuestos, tributos o taxes, responde según la línea "Impuestos:" y el tooltip del plan (ej. "Impuestos incluidos" / "No incluye impuestos"). **No confundas impuestos** con propinas, bebidas, excursiones, equipaje ni gastos personales de "No incluye" — eso no son impuestos salvo que digan "impuesto" explícitamente. Si el tooltip dice "No incluye impuestos", la respuesta es que los impuestos **no están incluidos** en la tarifa terrestre.
15. **Notas internas por plan**: en el contexto hay una sección "Notas internas de Cosmos por plan". Es información confidencial del equipo para orientarte; **debes tenerla en cuenta** al responder sobre ese plan (políticas, matices, excepciones, ideas). **No** la copies textualmente al usuario ni digas que existe un "bloque de notas internas"; integra el contenido de forma natural en la respuesta. **No** confundas estas notas con recomendaciones del PDF ni con la descripción pública del plan.

Contexto actualizado de la base de datos y la aplicación:

${knowledge}`;
}

export async function handleCosmosChat(req: Request, res: Response): Promise<void> {
  if (!isOpenAIConfigured()) {
    res.status(503).json({
      message:
        "Cosmos no está disponible: falta configurar OPENAI_API_KEY en el servidor (la misma clave del importador de planes).",
    });
    return;
  }

  const user = req.user as User;
  const { messages, currentPlanId } = chatBodySchema.parse(req.body);
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) {
    res.status(400).json({ message: "Se requiere al menos un mensaje del usuario." });
    return;
  }

  const client = await getOpenAIClient();
  if (!client) {
    res.status(503).json({ message: "OpenAI no configurado." });
    return;
  }

  const history = messages.slice(0, -1) as CosmosChatMessage[];
  const knowledge = await buildCosmosSystemContext({
    userMessage: lastUser.content,
    history,
    currentPlanId,
    userRole: user.role,
  });

  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt(user, knowledge) },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
      temperature: 0.55,
      max_tokens: 1200,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    logger.error("Cosmos chat stream error", { err, userId: user.id });
    if (!res.headersSent) {
      res.status(500).json({ message: "Error al generar la respuesta de Cosmos." });
      return;
    }
    res.write(`data: ${JSON.stringify({ error: "Error al generar la respuesta." })}\n\n`);
    res.end();
  }
}
