import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  cosmosAgentHealthPort,
  getCosmosAgentAutostartSkipReason,
  probeCosmosAgentHealth,
  resolveCosmosAgentSpawn,
} from "../startCosmosAgent";

const ORIGINAL_ENV = { ...process.env };

function restoreEnv() {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
}

function makeTree(files: string[]): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "cosmos-agent-"));
  for (const rel of files) {
    const full = path.join(root, rel);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, "");
  }
  return root;
}

describe("startCosmosAgent", () => {
  afterEach(() => {
    restoreEnv();
  });

  it("no arranca en test", () => {
    process.env.NODE_ENV = "test";
    process.env.LIVEKIT_URL = "wss://example.livekit.cloud";
    process.env.LIVEKIT_API_KEY = "APItest";
    process.env.LIVEKIT_API_SECRET = "secret";
    expect(getCosmosAgentAutostartSkipReason()).toBe("NODE_ENV=test");
  });

  it("no arranca si LiveKit no está configurado", () => {
    process.env.NODE_ENV = "production";
    delete process.env.LIVEKIT_URL;
    delete process.env.LIVEKIT_API_KEY;
    delete process.env.LIVEKIT_API_SECRET;
    expect(getCosmosAgentAutostartSkipReason()).toMatch(/LIVEKIT/);
  });

  it("en producción usa el JS compilado, no npm", () => {
    process.env.NODE_ENV = "production";
    const cwd = makeTree(["dist/cosmos-agent.js"]);
    try {
      const spec = resolveCosmosAgentSpawn(cwd);
      expect(spec.viaNpm).toBe(false);
      expect(spec.command).toBe(process.execPath);
      expect(spec.args).toEqual([path.join(cwd, "dist", "cosmos-agent.js"), "start"]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("si no hay build, usa tsx directamente", () => {
    process.env.NODE_ENV = "production";
    const cwd = makeTree(["node_modules/tsx/dist/cli.mjs", "server/agents/cosmos.ts"]);
    try {
      const spec = resolveCosmosAgentSpawn(cwd);
      expect(spec.viaNpm).toBe(false);
      expect(spec.args).toEqual([
        path.join(cwd, "node_modules", "tsx", "dist", "cli.mjs"),
        path.join(cwd, "server", "agents", "cosmos.ts"),
        "start",
      ]);
    } finally {
      rmSync(cwd, { recursive: true, force: true });
    }
  });

  it("elige un puerto de health distinto al de Express", async () => {
    process.env.PORT = "5000";
    delete process.env.COSMOS_AGENT_PORT;
    expect(cosmosAgentHealthPort()).toBe(8091);
    process.env.PORT = "8091";
    expect(cosmosAgentHealthPort()).toBe(8092);
    const health = await probeCosmosAgentHealth();
    expect(health.ok).toBe(false);
    expect(health.port).toBe(8092);
  });
});
