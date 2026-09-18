import "dotenv/config";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  type JobContext,
  type JobProcess,
  ServerOptions,
  cli,
  defineAgent,
  llm,
  voice,
} from "@livekit/agents";
import * as openai from "@livekit/agents-plugin-openai";
import * as silero from "@livekit/agents-plugin-silero";
import {
  COSMOS_LIVEKIT_AGENT_NAME,
  COSMOS_RPC,
  parseCosmosCaseBrief,
  parseCosmosVoiceJobMetadata,
  type CosmosClientAction,
} from "@shared/cosmosAgent";
import { ChatMessage } from "@livekit/agents";
import {
  COSMOS_STT_LANGUAGE,
  COSMOS_TTS_INSTRUCTIONS,
  COSMOS_TTS_MODEL,
} from "@shared/cosmosAssistantConfig";
import { getCosmosAssistantConfig } from "../services/cosmosAssistantConfigService";
import { buildCosmosSystemPrompt } from "../services/cosmosBrain";
import { buildCosmosSystemContext } from "../services/cosmosKnowledge";
import {
  appendCosmosSessionMessage,
  endCosmosSession,
  getCosmosSessionById,
  updateCosmosSessionMetadata,
} from "../services/cosmosSessionService";
import { executeCosmosTool, type CosmosToolContext } from "../services/cosmosTools";
import { storage } from "../storage";
import { logger } from "../logger";

function jobMetadataString(ctx: JobContext): string {
  const job = ctx.job as { metadata?: string };
  if (typeof job.metadata === "string" && job.metadata.trim()) return job.metadata;
  const room = ctx.room as { metadata?: string };
  return typeof room.metadata === "string" ? room.metadata : "";
}

async function performClientAction(
  ctx: JobContext,
  userIdentity: string,
  action: CosmosClientAction
): Promise<void> {
  const participant = ctx.room.localParticipant ?? ctx.agent;
  if (!participant) {
    throw new Error("Cosmos no tiene participante local para RPC");
  }
  await participant.performRpc({
    destinationIdentity: userIdentity,
    method: COSMOS_RPC.action,
    payload: JSON.stringify(action),
  });
}

function createTools(job: JobContext, toolCtx: CosmosToolContext, userIdentity: string) {
  const run = async (name: string, args: Record<string, unknown> = {}) => {
    const { result, action } = await executeCosmosTool(name, args, toolCtx);
    if (action) {
      try {
        await performClientAction(job, userIdentity, action);
      } catch (err) {
        logger.warn("RPC cosmos_action falló", { err, name });
        return `${result} (no pude aplicar el cambio en pantalla)`;
      }
    }
    if (toolCtx.sessionId) {
      await appendCosmosSessionMessage({
        sessionId: toolCtx.sessionId,
        role: "tool",
        content: result.slice(0, 4000),
        toolName: name,
      });
    }
    return result;
  };

  return [
    llm.tool({
      name: "search_plans",
      description: "Busca planes activos del catálogo.",
      parameters: z.object({ query: z.string() }),
      execute: async ({ query }) => run("search_plans", { query }),
    }),
    llm.tool({
      name: "get_plan_details",
      description: "Detalle de un plan.",
      parameters: z.object({ plan: z.string() }),
      execute: async ({ plan }) => run("get_plan_details", { plan }),
    }),
    llm.tool({
      name: "get_trm",
      description: "TRM del cotizador.",
      execute: async () => run("get_trm"),
    }),
    llm.tool({
      name: "open_plan",
      description: "Propone o abre la ficha del plan.",
      parameters: z.object({ plan: z.string(), immediate: z.boolean().optional() }),
      execute: async (args) => run("open_plan", args),
    }),
    llm.tool({
      name: "start_quote",
      description: "Prellena cotización y propone ir a esa pantalla. replace=true empieza limpio.",
      parameters: z.object({
        plans: z.array(z.string()).min(1),
        startDate: z.string().optional(),
        replace: z.boolean().optional(),
        immediate: z.boolean().optional(),
      }),
      execute: async (args) => run("start_quote", args),
    }),
    llm.tool({
      name: "resume_quote",
      description: "Vuelve a la cotización en curso con los datos que ya estaban.",
      execute: async () => run("resume_quote"),
    }),
    llm.tool({
      name: "save_quote",
      description: "Guarda el borrador. thenReset=true guarda y empieza una nueva.",
      parameters: z.object({
        clientId: z.string().optional(),
        clientName: z.string().optional(),
        clientEmail: z.string().optional(),
        thenReset: z.boolean().optional(),
      }),
      execute: async (args) => run("save_quote", args),
    }),
    llm.tool({
      name: "reset_quote",
      description: "Descarta el borrador y empieza una cotización limpia.",
      execute: async () => run("reset_quote"),
    }),
    llm.tool({
      name: "navigate_to",
      description: "Propone llevar al asesor a una pantalla de la plataforma.",
      parameters: z.object({
        place: z.string(),
        plan: z.string().optional(),
        quoteId: z.string().optional(),
        courseId: z.string().optional(),
        lessonId: z.string().optional(),
        immediate: z.boolean().optional(),
      }),
      execute: async (args) => run("navigate_to", args),
    }),
    llm.tool({
      name: "highlight_ui",
      description: "Señala el input concreto (quote.flightsCost, quote.dates, quote.pvp, etc.).",
      parameters: z.object({ target: z.string(), query: z.string().optional() }),
      execute: async (args) => run("highlight_ui", args),
    }),
    llm.tool({
      name: "patch_quote",
      description:
        "Rellena SOLO el campo dictado: planes, fecha, pax, ciudad, vuelos, asistencia, PVP, pago mínimo, nombre del PDF y mejoras. No metas PVP si no lo pidió. No genera PDF.",
      parameters: z.object({
        plans: z.array(z.string()).optional(),
        startDate: z.string().optional(),
        passengers: z.number().optional(),
        originCity: z.string().optional(),
        flightsCost: z.union([z.number(), z.string()]).optional(),
        flightsCurrency: z.enum(["USD", "COP"]).optional(),
        assistanceCost: z.union([z.number(), z.string()]).optional(),
        assistanceCurrency: z.enum(["USD", "COP"]).optional(),
        finalPrice: z.union([z.number(), z.string()]).optional(),
        finalPriceCurrency: z.enum(["USD", "COP"]).optional(),
        minPayment: z.union([z.number(), z.string()]).optional(),
        minPaymentPercent: z.number().int().min(1).max(100).optional(),
        customFilename: z.string().optional(),
        upgrades: z
          .array(
            z.object({
              plan: z.string().optional(),
              code: z.string().optional(),
              name: z.string().optional(),
              upgrade: z.string().optional(),
              clear: z.boolean().optional(),
            })
          )
          .optional(),
      }),
      execute: async (args) => run("patch_quote", args),
    }),
    llm.tool({
      name: "validate_quote_draft",
      description: "Valida combinación, bloqueos y fechas.",
      parameters: z.object({
        plans: z.array(z.string()).optional(),
        startDate: z.string().optional(),
        passengers: z.number().optional(),
      }),
      execute: async (args) => run("validate_quote_draft", args),
    }),
    llm.tool({
      name: "estimate_quote",
      description: "Estima terrestre × pasajeros con TRM.",
      parameters: z.object({
        plans: z.array(z.string()).optional(),
        passengers: z.number().optional(),
      }),
      execute: async (args) => run("estimate_quote", args),
    }),
    llm.tool({
      name: "search_quotes",
      description: "Busca cotizaciones del asesor.",
      parameters: z.object({ query: z.string().optional() }),
      execute: async (args) => run("search_quotes", args),
    }),
    llm.tool({
      name: "get_quote_detail",
      description: "Detalle de una cotización guardada.",
      parameters: z.object({ quoteId: z.string() }),
      execute: async (args) => run("get_quote_detail", args),
    }),
    llm.tool({
      name: "search_clients",
      description: "Busca clientes del asesor.",
      parameters: z.object({ query: z.string() }),
      execute: async (args) => run("search_clients", args),
    }),
    llm.tool({
      name: "compare_plans",
      description: "Compara 2 o 3 planes.",
      parameters: z.object({ plans: z.array(z.string()).min(2).max(3) }),
      execute: async (args) => run("compare_plans", args),
    }),
    llm.tool({
      name: "get_bloqueo_availability",
      description: "Cupos de bloqueos activos.",
      execute: async () => run("get_bloqueo_availability"),
    }),
    llm.tool({
      name: "search_academy",
      description: "Busca cursos de la academia.",
      parameters: z.object({ query: z.string() }),
      execute: async (args) => run("search_academy", args),
    }),
    llm.tool({
      name: "get_academy_lesson",
      description: "Extracto de una lección.",
      parameters: z.object({ courseId: z.string(), lessonId: z.string().optional() }),
      execute: async (args) => run("get_academy_lesson", args),
    }),
    llm.tool({
      name: "update_case_brief",
      description: "Guarda el brief del caso.",
      parameters: z.object({
        clientName: z.string().optional(),
        clientId: z.string().optional(),
        passengers: z.number().optional(),
        budgetUsd: z.number().optional(),
        dates: z.string().optional(),
        destinations: z.array(z.string()).optional(),
        notes: z.string().optional(),
      }),
      execute: async (args) => run("update_case_brief", args),
    }),
    llm.tool({
      name: "get_case_brief",
      description: "Lee el brief de la sesión.",
      execute: async () => run("get_case_brief"),
    }),
    llm.tool({
      name: "confirm_pending_action",
      description: "Ejecuta la última propuesta cuando el usuario confirma.",
      execute: async () => run("confirm_pending_action"),
    }),
    llm.tool({
      name: "inspect_my_plans",
      description: "Inventario de planes (proveedor/admin).",
      execute: async () => run("inspect_my_plans"),
    }),
    llm.tool({
      name: "get_workspace_snapshot",
      description: "Resumen operativo solo admin.",
      execute: async () => run("get_workspace_snapshot"),
    }),
    llm.tool({
      name: "get_dashboard_stats",
      description: "KPIs del dashboard admin.",
      execute: async () => run("get_dashboard_stats"),
    }),
    llm.tool({
      name: "get_quote_advisor_stats",
      description: "Cotizaciones por agencia.",
      parameters: z.object({ limit: z.number().optional() }),
      execute: async (args) => run("get_quote_advisor_stats", args),
    }),
    llm.tool({
      name: "get_top_destinations",
      description: "Destinos más cotizados.",
      parameters: z.object({
        sortBy: z.enum(["count", "amount"]).optional(),
        limit: z.number().optional(),
      }),
      execute: async (args) => run("get_top_destinations", args),
    }),
    llm.tool({
      name: "get_quotes_trend",
      description: "Tendencia de cotizaciones.",
      parameters: z.object({ days: z.number().optional() }),
      execute: async (args) => run("get_quotes_trend", args),
    }),
    llm.tool({
      name: "search_admin_users",
      description: "Busca usuarios de la plataforma.",
      parameters: z.object({
        query: z.string().optional(),
        filter: z.enum(["all", "pending", "inactive", "agency", "provider"]).optional(),
        limit: z.number().optional(),
      }),
      execute: async (args) => run("search_admin_users", args),
    }),
    llm.tool({
      name: "get_user_access",
      description: "Módulos habilitados de un usuario.",
      parameters: z.object({ user: z.string() }),
      execute: async (args) => run("get_user_access", args),
    }),
    llm.tool({
      name: "set_user_modules",
      description: "Enciende o apaga módulos de un usuario, con confirmación.",
      parameters: z.object({
        user: z.string(),
        enable: z.array(z.string()).optional(),
        disable: z.array(z.string()).optional(),
        milesProgramsAllowed: z.enum(["none", "lifemiles", "smiles", "both"]).optional(),
        confirm: z.boolean().optional(),
      }),
      execute: async (args) => run("set_user_modules", args),
    }),
    llm.tool({
      name: "search_managed_plans",
      description: "Busca planes del inventario, incluidos inactivos.",
      parameters: z.object({
        query: z.string().optional(),
        status: z.enum(["all", "active", "inactive"]).optional(),
        limit: z.number().optional(),
      }),
      execute: async (args) => run("search_managed_plans", args),
    }),
    llm.tool({
      name: "set_plan_active",
      description: "Activa o desactiva un plan, con confirmación.",
      parameters: z.object({
        plan: z.string(),
        active: z.boolean(),
        confirm: z.boolean().optional(),
      }),
      execute: async (args) => run("set_plan_active", args),
    }),
  ];
}

export default defineAgent({
  prewarm: async (proc: JobProcess) => {
    proc.userData.vad = await silero.VAD.load();
  },
  entry: async (ctx: JobContext) => {
    await ctx.connect();

    const rawMetadata = jobMetadataString(ctx);
    const metadata = parseCosmosVoiceJobMetadata(rawMetadata);
    if (!metadata) {
      logger.error("Cosmos voice: metadata de job inválida", {
        raw: rawMetadata.slice(0, 800),
      });
      ctx.shutdown("metadata inválida");
      return;
    }

    const user = await storage.findUserById(metadata.userId);
    const toolCtx: CosmosToolContext = {
      userId: metadata.userId,
      userRole: metadata.userRole,
      userName: metadata.userName,
      sessionId: metadata.sessionId,
      screen: metadata.screen,
      enabledModules: user?.enabledModules,
      milesProgramsAllowed: user?.milesProgramsAllowed,
    };
    const [knowledge, cosmosConfig, sessionRow] = await Promise.all([
      buildCosmosSystemContext({
        userMessage: metadata.currentPlanId || metadata.screen?.planId ? "plan en pantalla" : "hola",
        history: [],
        currentPlanId: metadata.currentPlanId ?? metadata.screen?.planId,
        userRole: metadata.userRole,
        screen: metadata.screen,
      }),
      getCosmosAssistantConfig(),
      getCosmosSessionById(metadata.sessionId),
    ]);
    const sessionBrief = parseCosmosCaseBrief(
      (sessionRow?.metadata as Record<string, unknown> | null)?.brief
    );
    const knowledgeWithBrief = sessionBrief
      ? `${knowledge}\n\n## Brief del caso (sesión)\n${JSON.stringify(sessionBrief)}`
      : knowledge;

    const instructions = buildCosmosSystemPrompt({
      user: { name: metadata.userName, username: metadata.userName, role: metadata.userRole },
      knowledge: knowledgeWithBrief,
      config: cosmosConfig,
      channel: metadata.channel,
    });

    const session = new voice.AgentSession({
      stt: new openai.STT({
        language: COSMOS_STT_LANGUAGE,
        detectLanguage: false,
      }),
      llm: new openai.LLM({
        model: "gpt-4o-mini",
        temperature: cosmosConfig.temperature,
      }),
      tts: new openai.TTS({
        model: COSMOS_TTS_MODEL,
        voice: cosmosConfig.voice,
        instructions: COSMOS_TTS_INSTRUCTIONS,
      }),
      vad: ctx.proc.userData.vad as InstanceType<typeof silero.VAD>,
    });

    session.on(voice.AgentSessionEventTypes.ConversationItemAdded, (event) => {
      if (!(event.item instanceof ChatMessage)) return;
      const content = event.item.textContent?.trim();
      if (!content) return;
      const role = event.item.role === "assistant" ? "assistant" : "user";
      void appendCosmosSessionMessage({
        sessionId: metadata.sessionId,
        role,
        content,
      });
    });

    session.on(voice.AgentSessionEventTypes.SessionUsageUpdated, (ev) => {
      void updateCosmosSessionMetadata(metadata.sessionId, {
        usage: JSON.parse(JSON.stringify(ev.usage)),
      });
    });

    ctx.addShutdownCallback(async () => {
      await endCosmosSession(metadata.sessionId);
    });

    await session.start({
      agent: voice.Agent.create({
        instructions,
        tools: createTools(ctx, toolCtx, metadata.userIdentity),
      }),
      room: ctx.room,
    });

    await session.generateReply({
      instructions: `Saluda a ${metadata.userName} en español latino de Colombia, en una frase corta, y ofrece ayuda con planes o cotizaciones. No uses inglés.`,
    });
  },
});

/** El job worker importa este archivo; no debe volver a parsear el CLI ni salir. */
const invokedAsJobWorker = /job_proc/.test(process.argv[1] ?? "");

function cosmosAgentHealthPort(): number {
  const explicit = Number(process.env.COSMOS_AGENT_PORT);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  const webPort = Number(process.env.PORT);
  return webPort === 8091 ? 8092 : 8091;
}

if (!invokedAsJobWorker) {
  cli.runApp(
    new ServerOptions({
      agent: fileURLToPath(import.meta.url),
      agentName: COSMOS_LIVEKIT_AGENT_NAME,
      wsURL: process.env.LIVEKIT_URL,
      apiKey: process.env.LIVEKIT_API_KEY,
      apiSecret: process.env.LIVEKIT_API_SECRET,
      // En el mismo contenedor que Express: 1 proceso idle, puerto distinto a PORT.
      numIdleProcesses: 1,
      initializeProcessTimeout: 60_000,
      loadThreshold: 0.95,
      port: cosmosAgentHealthPort(),
    })
  );
}
