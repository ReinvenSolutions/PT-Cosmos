import type { Request, Response } from "express";
import { z } from "zod";
import type { User } from "@shared/schema";
import {
  applyCosmosConfigTemplates,
  buildCosmosUserGreetingLine,
  type CosmosAssistantConfig,
} from "@shared/cosmosAssistantConfig";
import { getOpenAIClient, isOpenAIConfigured } from "../services/openaiClient";
import { buildCosmosSystemContext, type CosmosChatMessage } from "../services/cosmosKnowledge";
import { getCosmosAssistantConfig } from "../services/cosmosAssistantConfigService";
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

function buildSystemPrompt(user: User, knowledge: string, config: CosmosAssistantConfig): string {
  const firstName = displayName(user);
  const roleLabel =
    user.role === "super_admin"
      ? "administrador"
      : user.role === "provider"
        ? "proveedor"
        : "agencia";

  const identity = applyCosmosConfigTemplates(config.identity);
  const personality = applyCosmosConfigTemplates(config.personality);
  const rules = applyCosmosConfigTemplates(config.rules);
  const greeting = buildCosmosUserGreetingLine(firstName, roleLabel, config.userGreetingHint);

  return `${identity}

${personality}

${greeting}

Reglas:
${rules}

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
  const [knowledge, cosmosConfig] = await Promise.all([
    buildCosmosSystemContext({
      userMessage: lastUser.content,
      history,
      currentPlanId,
      userRole: user.role,
    }),
    getCosmosAssistantConfig(),
  ]);

  const openaiMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: buildSystemPrompt(user, knowledge, cosmosConfig) },
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
      temperature: cosmosConfig.temperature,
      max_tokens: cosmosConfig.maxTokens,
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
