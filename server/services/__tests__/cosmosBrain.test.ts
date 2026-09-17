import { describe, expect, it } from "vitest";
import { DEFAULT_COSMOS_ASSISTANT_CONFIG } from "@shared/cosmosAssistantConfig";
import { buildCosmosSystemPrompt } from "../cosmosBrain";

const user = { name: "Ana López", username: "ana", role: "agency" as const };

describe("buildCosmosSystemPrompt idioma", () => {
  it("bloquea inglés en todos los canales", () => {
    const prompt = buildCosmosSystemPrompt({
      user,
      knowledge: "catálogo",
      config: DEFAULT_COSMOS_ASSISTANT_CONFIG,
      channel: "text",
    });
    expect(prompt).toMatch(/IDIOMA OBLIGATORIO: español latino de Colombia/);
    expect(prompt).toMatch(/Prohibido el inglés/);
    expect(prompt).toMatch(/mejoras\/upgrades/);
    expect(prompt).toMatch(/resume_quote/);
    expect(prompt).toMatch(/save_quote/);
    expect(prompt).toMatch(/reset_quote/);
    expect(prompt).toMatch(/cotización NUEVA/);
  });

  it("refuerza español latino y frases cortas en voz", () => {
    const voicePrompt = buildCosmosSystemPrompt({
      user,
      knowledge: "catálogo",
      config: DEFAULT_COSMOS_ASSISTANT_CONFIG,
      channel: "voice",
    });
    expect(voicePrompt).toMatch(/Canal de voz: habla en español latino de Colombia/);
    expect(voicePrompt).toMatch(/Nunca cambies a inglés/);

    const textPrompt = buildCosmosSystemPrompt({
      user,
      knowledge: "catálogo",
      config: DEFAULT_COSMOS_ASSISTANT_CONFIG,
      channel: "text",
    });
    expect(textPrompt).not.toMatch(/Canal de voz/);
  });

  it("explica herramientas de dashboard y módulos solo al admin", () => {
    const adminPrompt = buildCosmosSystemPrompt({
      user: { name: "Felipe", username: "felipe", role: "super_admin" },
      knowledge: "catálogo",
      config: DEFAULT_COSMOS_ASSISTANT_CONFIG,
      channel: "text",
    });
    expect(adminPrompt).toMatch(/get_dashboard_stats/);
    expect(adminPrompt).toMatch(/set_user_modules/);
    expect(adminPrompt).toMatch(/set_plan_active/);
    expect(adminPrompt).not.toMatch(/No cambies TRM, usuarios, módulos ni precios del catálogo/);

    const agencyPrompt = buildCosmosSystemPrompt({
      user,
      knowledge: "catálogo",
      config: DEFAULT_COSMOS_ASSISTANT_CONFIG,
      channel: "text",
    });
    expect(agencyPrompt).not.toMatch(/set_user_modules/);
    expect(agencyPrompt).toMatch(/No cambies TRM, usuarios, módulos ni precios del catálogo/);
  });
});
