import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { User } from "@shared/schema";
import type OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import type { CosmosAssistantConfig } from "@shared/cosmosAssistantConfig";
import { getOpenAIClient, isOpenAIConfigured } from "../services/openaiClient";
import { buildCosmosSystemContext, type CosmosChatMessage } from "../services/cosmosKnowledge";
import { getCosmosAssistantConfig } from "../services/cosmosAssistantConfigService";
import { buildCosmosSystemPrompt } from "../services/cosmosBrain";
import { executeCosmosTool, openaiCosmosToolsForRole, type CosmosToolContext } from "../services/cosmosTools";
import {
  appendCosmosSessionMessage,
  ensureCosmosSession,
} from "../services/cosmosSessionService";
import { logger } from "../logger";
import { parseCosmosClientAction, cosmosScreenContextSchema, parseCosmosCaseBrief, type CosmosClientAction } from "@shared/cosmosAgent";

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
  sessionId: z.string().uuid().optional(),
  screen: cosmosScreenContextSchema.optional(),
});

function writeSse(res: Response, payload: Record<string, unknown>) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
  const flushable = res as Response & { flush?: () => void };
  flushable.flush?.();
}

type StreamedToolCall = { id: string; name: string; arguments: string };

async function runToolLoop(
  client: OpenAI,
  seed: ChatCompletionMessageParam[],
  config: CosmosAssistantConfig,
  toolCtx: CosmosToolContext,
  onAction: (action: CosmosClientAction) => void,
  onContent: (text: string) => void
): Promise<{ content: string; actions: CosmosClientAction[] }> {
  const messages: ChatCompletionMessageParam[] = [...seed];
  const actions: CosmosClientAction[] = [];

  for (let round = 0; round < 4; round++) {
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      tools: openaiCosmosToolsForRole(toolCtx.userRole),
      tool_choice: "auto",
      stream: true,
    });

    let content = "";
    let mode: "unknown" | "tools" | "text" = "unknown";
    const toolCalls: StreamedToolCall[] = [];

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      const toolDeltas = delta.tool_calls ?? [];
      if (mode === "unknown") {
        if (toolDeltas.length) mode = "tools";
        else if (typeof delta.content === "string" && delta.content.length) mode = "text";
      }
      if (mode === "tools" && toolDeltas.length) {
        for (const tc of toolDeltas) {
          const idx = tc.index ?? toolCalls.length;
          if (!toolCalls[idx]) toolCalls[idx] = { id: "", name: "", arguments: "" };
          if (tc.id) toolCalls[idx].id = tc.id;
          if (tc.function?.name) toolCalls[idx].name += tc.function.name;
          if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments;
        }
      }
      if (mode === "text" && typeof delta.content === "string" && delta.content) {
        content += delta.content;
        onContent(delta.content);
      }
    }

    const functionCalls = toolCalls.filter((tc) => tc.name);
    if (functionCalls.length) {
      messages.push({
        role: "assistant",
        content: content || null,
        tool_calls: functionCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments || "{}" },
        })),
      });

      for (const call of functionCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
        } catch {
          args = {};
        }
        const executed = await executeCosmosTool(call.name, args, toolCtx);
        if (executed.action) {
          actions.push(executed.action);
          onAction(executed.action);
        }
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: executed.result,
        });
      }
      continue;
    }

    return { content: content.trim(), actions };
  }

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const lastContent =
    lastAssistant && typeof lastAssistant.content === "string" ? lastAssistant.content.trim() : "";
  return { content: lastContent, actions };
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
  const { messages, currentPlanId, sessionId: clientSessionId, screen } = chatBodySchema.parse(req.body);
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

  const sessionId = clientSessionId ?? randomUUID();
  const history = messages.slice(0, -1) as CosmosChatMessage[];
  const session = await ensureCosmosSession({
    id: sessionId,
    userId: user.id,
    channel: "text",
    currentPlanId: currentPlanId ?? screen?.planId ?? null,
  });
  const brief = parseCosmosCaseBrief((session.metadata as Record<string, unknown> | null)?.brief);
  const toolCtx: CosmosToolContext = {
    userId: user.id,
    userRole: user.role,
    userName: user.name ?? user.username,
    sessionId,
    screen,
    enabledModules: user.enabledModules,
    milesProgramsAllowed: user.milesProgramsAllowed,
  };
  const [knowledge, cosmosConfig] = await Promise.all([
    buildCosmosSystemContext({
      userMessage: lastUser.content,
      history,
      currentPlanId: currentPlanId ?? screen?.planId,
      userRole: user.role,
      screen,
      brief,
    }),
    getCosmosAssistantConfig(),
  ]);

  const openaiMessages: ChatCompletionMessageParam[] = [
    { role: "system", content: buildCosmosSystemPrompt({ user, knowledge, config: cosmosConfig, channel: "text" }) },
    ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
  ];

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  writeSse(res, { sessionId });

  try {
    const { content } = await runToolLoop(
      client,
      openaiMessages,
      cosmosConfig,
      toolCtx,
      (action) => {
        if (parseCosmosClientAction(action)) writeSse(res, { action });
      },
      (text) => {
        if (text) writeSse(res, { content: text });
      }
    );
    await Promise.all([
      appendCosmosSessionMessage({ sessionId, role: "user", content: lastUser.content }),
      content
        ? appendCosmosSessionMessage({ sessionId, role: "assistant", content })
        : Promise.resolve(),
    ]);
    writeSse(res, { done: true, sessionId });
    res.end();
  } catch (err) {
    logger.error("Cosmos chat stream error", { err, userId: user.id });
    if (!res.headersSent) {
      res.status(500).json({ message: "Error al generar la respuesta de Cosmos." });
      return;
    }
    writeSse(res, { error: "Error al generar la respuesta." });
    res.end();
  }
}
