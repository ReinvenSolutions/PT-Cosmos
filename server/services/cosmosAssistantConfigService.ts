import {
  COSMOS_ASSISTANT_CONFIG_KEY,
  type CosmosAssistantConfig,
  type CosmosAssistantConfigResponse,
  cosmosAssistantConfigSchema,
  DEFAULT_COSMOS_ASSISTANT_CONFIG,
  mergeCosmosAssistantConfig,
} from "@shared/cosmosAssistantConfig";
import { storage } from "../storage";
import { cache } from "../utils/cache";
import { sanitizeCosmosAssistantNotes } from "../utils/sanitize";

const CACHE_KEY = "cosmos-assistant-config";

function parseStoredConfig(raw: string | null): CosmosAssistantConfigResponse {
  if (!raw) {
    return { ...DEFAULT_COSMOS_ASSISTANT_CONFIG, updatedAt: null };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CosmosAssistantConfig> & { updatedAt?: string | null };
    const merged = mergeCosmosAssistantConfig(parsed);
    return {
      ...merged,
      updatedAt: parsed.updatedAt ?? null,
    };
  } catch {
    return { ...DEFAULT_COSMOS_ASSISTANT_CONFIG, updatedAt: null };
  }
}

export async function getCosmosAssistantConfig(): Promise<CosmosAssistantConfigResponse> {
  const cached = cache.get<CosmosAssistantConfigResponse>(CACHE_KEY);
  if (cached) return cached;

  const raw = await storage.getAppSetting(COSMOS_ASSISTANT_CONFIG_KEY);
  const config = parseStoredConfig(raw);
  cache.set(CACHE_KEY, config, 120);
  return config;
}

export async function setCosmosAssistantConfig(
  input: CosmosAssistantConfig
): Promise<CosmosAssistantConfigResponse> {
  const sanitized: CosmosAssistantConfig = cosmosAssistantConfigSchema.parse({
    ...input,
    strategicContext: sanitizeCosmosAssistantNotes(input.strategicContext) ?? "",
  });

  const payload: CosmosAssistantConfigResponse = {
    ...sanitized,
    updatedAt: new Date().toISOString(),
  };

  await storage.setAppSetting(COSMOS_ASSISTANT_CONFIG_KEY, JSON.stringify(payload));
  cache.del(CACHE_KEY);
  cache.set(CACHE_KEY, payload, 120);
  return payload;
}

export function invalidateCosmosAssistantConfigCache(): void {
  cache.del(CACHE_KEY);
}
