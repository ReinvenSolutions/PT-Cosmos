import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const node = process.execPath;
const agentJs = path.join(cwd, "dist", "cosmos-agent.js");
const serverJs = path.join(cwd, "dist", "index.js");

if (!existsSync(serverJs)) {
  console.error("Falta dist/index.js. Corre npm run build.");
  process.exit(1);
}

const livekitConfigured = Boolean(
  process.env.LIVEKIT_URL?.trim() &&
    process.env.LIVEKIT_API_KEY?.trim() &&
    process.env.LIVEKIT_API_SECRET?.trim()
);

const webPort = Number(process.env.PORT);
if (!process.env.COSMOS_AGENT_PORT) {
  process.env.COSMOS_AGENT_PORT = String(webPort === 8091 ? 8092 : 8091);
}

let agent = null;
let restartTimer = null;
let shuttingDown = false;
let restartAttempt = 0;

function startAgent() {
  if (!livekitConfigured) {
    console.log("🎙️ Cosmos voz: sin LIVEKIT_*, el worker no arranca");
    return;
  }
  if (!existsSync(agentJs)) {
    console.error("🎙️ Cosmos voz: falta dist/cosmos-agent.js (el build no lo generó)");
    return;
  }
  console.log(
    `🎙️ Cosmos voz: arrancando ${agentJs} start (health ${process.env.COSMOS_AGENT_PORT})`
  );
  agent = spawn(node, [agentJs, "start"], {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: "production",
      COSMOS_AGENT_CHILD: "1",
    },
  });
  agent.on("exit", (code, signal) => {
    agent = null;
    if (shuttingDown || signal === "SIGTERM") return;
    restartAttempt += 1;
    const delay = Math.min(30_000, 2000 * 2 ** Math.min(restartAttempt - 1, 4));
    console.warn(`🎙️ Cosmos voz: worker salió (${code}/${signal}), reintento en ${delay}ms`);
    restartTimer = setTimeout(startAgent, delay);
  });
}

const server = spawn(node, [serverJs], {
  cwd,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "production",
    COSMOS_AGENT_AUTOSTART: "0",
  },
});

server.on("exit", (code, signal) => {
  shuttingDown = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (agent?.pid) {
    try {
      agent.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  process.exit(code ?? (signal ? 1 : 0));
});

startAgent();

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  if (restartTimer) clearTimeout(restartTimer);
  if (agent?.pid) {
    try {
      agent.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
  if (server?.pid) {
    try {
      server.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  }
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
