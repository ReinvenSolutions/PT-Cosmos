import { spawn, type ChildProcess } from "node:child_process";
import { isLiveKitConfigured } from "./services/livekit";
import { logger } from "./logger";

let worker: ChildProcess | null = null;
let exitHookInstalled = false;

function shouldAutostartCosmosAgent(): boolean {
  if (process.env.COSMOS_AGENT_CHILD === "1") return false;
  const autostart = process.env.COSMOS_AGENT_AUTOSTART?.trim().toLowerCase();
  if (autostart === "0" || autostart === "false") return false;
  if (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test") return false;
  if (process.env.RAILWAY_ENVIRONMENT) return false;
  return isLiveKitConfigured();
}

export function startCosmosAgentIfNeeded(): void {
  if (!shouldAutostartCosmosAgent()) return;
  if (worker && worker.exitCode === null && !worker.killed) return;

  const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
  worker = spawn(npmCmd, ["run", "cosmos:agent"], {
    cwd: process.cwd(),
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, COSMOS_AGENT_CHILD: "1" },
  });

  worker.on("error", (err) => {
    logger.warn("No se pudo arrancar el worker de voz de Cosmos", { err });
    worker = null;
  });

  worker.on("exit", (code, signal) => {
    if (signal !== "SIGTERM" && code !== 0 && code !== null) {
      logger.warn("El worker de voz de Cosmos se detuvo", { code, signal });
    }
    worker = null;
  });

  if (!exitHookInstalled) {
    exitHookInstalled = true;
    process.on("exit", () => {
      if (!worker?.pid) return;
      try {
        worker.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    });
  }

  logger.info("🎙️ Cosmos voz: worker LiveKit iniciado junto al servidor");
}
