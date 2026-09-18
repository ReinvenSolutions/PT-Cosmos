import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { isLiveKitConfigured } from "./services/livekit";
import { logger } from "./logger";

let worker: ChildProcess | null = null;
let exitHookInstalled = false;
let restartTimer: ReturnType<typeof setTimeout> | null = null;
let restartAttempt = 0;
let stopping = false;

export type CosmosAgentSpawnSpec = {
  command: string;
  args: string[];
  viaNpm: boolean;
};

export function getCosmosAgentAutostartSkipReason(): string | null {
  if (process.env.COSMOS_AGENT_CHILD === "1") return "proceso hijo del worker";
  if (process.env.NODE_ENV === "test") return "NODE_ENV=test";
  const autostart = process.env.COSMOS_AGENT_AUTOSTART?.trim().toLowerCase();
  if (autostart === "0" || autostart === "false") return "COSMOS_AGENT_AUTOSTART=0";
  if (!isLiveKitConfigured()) return "faltan LIVEKIT_URL, LIVEKIT_API_KEY o LIVEKIT_API_SECRET";
  return null;
}

/**
 * Resuelve cómo arrancar el worker LiveKit sin depender de `npm` en PATH.
 * En producción usa el JS compilado; si no existe, cae a tsx y por último a npm.
 */
export function resolveCosmosAgentSpawn(cwd = process.cwd()): CosmosAgentSpawnSpec {
  const production = process.env.NODE_ENV === "production";
  const mode = production ? "start" : "dev";
  const compiledAgent = path.join(cwd, "dist", "cosmos-agent.js");
  if (production && existsSync(compiledAgent)) {
    return { command: process.execPath, args: [compiledAgent, mode], viaNpm: false };
  }

  const tsxCli = path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs");
  const agentTs = path.join(cwd, "server", "agents", "cosmos.ts");
  if (existsSync(tsxCli) && existsSync(agentTs)) {
    return { command: process.execPath, args: [tsxCli, agentTs, mode], viaNpm: false };
  }

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  return {
    command: npmCmd,
    args: ["run", production ? "cosmos:agent:start" : "cosmos:agent"],
    viaNpm: true,
  };
}

function scheduleCosmosAgentRestart(): void {
  if (stopping || restartTimer) return;
  restartAttempt += 1;
  const delayMs = Math.min(30_000, 2000 * 2 ** Math.min(restartAttempt - 1, 4));
  logger.warn("Reintentando worker de voz de Cosmos", { attempt: restartAttempt, delayMs });
  restartTimer = setTimeout(() => {
    restartTimer = null;
    startCosmosAgentIfNeeded();
  }, delayMs);
  restartTimer.unref?.();
}

export function startCosmosAgentIfNeeded(): void {
  const skipReason = getCosmosAgentAutostartSkipReason();
  if (skipReason) {
    logger.info("🎙️ Cosmos voz: worker no arrancado", { reason: skipReason });
    return;
  }
  if (worker && worker.exitCode === null && !worker.killed) return;

  const spec = resolveCosmosAgentSpawn();
  const webPort = Number(process.env.PORT);
  const agentPort = Number(process.env.COSMOS_AGENT_PORT) || (webPort === 8091 ? 8092 : 8091);
  worker = spawn(spec.command, spec.args, {
    cwd: process.cwd(),
    stdio: ["ignore", "inherit", "inherit"],
    env: {
      ...process.env,
      COSMOS_AGENT_CHILD: "1",
      COSMOS_AGENT_PORT: String(agentPort),
    },
    // npm suele ser un script de shell; node/tsx no lo necesitan.
    shell: spec.viaNpm,
  });

  worker.on("error", (err) => {
    logger.warn("No se pudo arrancar el worker de voz de Cosmos", {
      err,
      command: spec.command,
      args: spec.args,
    });
    worker = null;
    scheduleCosmosAgentRestart();
  });

  worker.on("exit", (code, signal) => {
    worker = null;
    if (stopping || signal === "SIGTERM") return;
    if (code !== 0 && code !== null) {
      logger.warn("El worker de voz de Cosmos se detuvo", { code, signal });
    }
    scheduleCosmosAgentRestart();
  });

  if (!exitHookInstalled) {
    exitHookInstalled = true;
    const stop = () => {
      stopping = true;
      if (restartTimer) {
        clearTimeout(restartTimer);
        restartTimer = null;
      }
      if (!worker?.pid) return;
      try {
        worker.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    };
    process.on("exit", stop);
  }

  logger.info("🎙️ Cosmos voz: worker LiveKit iniciado junto al servidor", {
    command: spec.command,
    args: spec.args,
    agentPort,
  });
}
