import { describe, expect, it } from "vitest";
import {
  cosmosAssistantConfigSchema,
  DEFAULT_COSMOS_ASSISTANT_CONFIG,
  DEFAULT_COSMOS_ASSISTANT_RULES,
  mergeCosmosAssistantConfig,
  COSMOS_STT_LANGUAGE,
  COSMOS_TTS_MODEL,
} from "../cosmosAssistantConfig";

describe("mergeCosmosAssistantConfig", () => {
  it("usa Nova si no hay voz guardada", () => {
    const merged = mergeCosmosAssistantConfig({ identity: "Hola" });
    expect(merged.voice).toBe("nova");
    expect(merged.identity).toBe("Hola");
  });

  it("conserva una voz válida", () => {
    expect(mergeCosmosAssistantConfig({ voice: "onyx" }).voice).toBe("onyx");
  });

  it("ignora voces inválidas", () => {
    expect(mergeCosmosAssistantConfig({ voice: "robot" as never }).voice).toBe("nova");
  });
});

describe("cosmosAssistantConfigSchema", () => {
  it("exige una voz conocida", () => {
    expect(cosmosAssistantConfigSchema.safeParse(DEFAULT_COSMOS_ASSISTANT_CONFIG).success).toBe(
      true
    );
    expect(
      cosmosAssistantConfigSchema.safeParse({ ...DEFAULT_COSMOS_ASSISTANT_CONFIG, voice: "marin" })
        .success
    ).toBe(false);
  });
});

describe("idioma de Cosmos", () => {
  it("fija personalidad y reglas en español latino", () => {
    expect(DEFAULT_COSMOS_ASSISTANT_CONFIG.personality).toMatch(/español latino/i);
    expect(DEFAULT_COSMOS_ASSISTANT_RULES).toMatch(/español latino de Colombia/i);
    expect(DEFAULT_COSMOS_ASSISTANT_RULES).toMatch(/Nunca uses inglés/i);
  });

  it("usa transcripción en español y TTS con instrucciones de acento", () => {
    expect(COSMOS_STT_LANGUAGE).toBe("es");
    expect(COSMOS_TTS_MODEL).toBe("gpt-4o-mini-tts");
  });
});
