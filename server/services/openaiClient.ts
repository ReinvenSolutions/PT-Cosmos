import type OpenAI from "openai";

let clientPromise: Promise<OpenAI | null> | null = null;

/** Cliente OpenAI compartido (misma API que extract-plan). Null si no hay OPENAI_API_KEY. */
export function getOpenAIClient(): Promise<OpenAI | null> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return Promise.resolve(null);

  if (!clientPromise) {
    clientPromise = import("openai").then(({ default: OpenAI }) => new OpenAI({ apiKey }));
  }
  return clientPromise;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}
