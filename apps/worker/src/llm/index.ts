import { geminiGenerate } from "./gemini";

export async function llmGenerate(opts: { prompt: string; jsonSchema?: any }) {
  const provider = (process.env.LLM_PROVIDER || "gemini").toLowerCase();
  if (provider !== "gemini")
    throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);

  const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
  return geminiGenerate({
    model,
    prompt: opts.prompt,
    jsonSchema: opts.jsonSchema,
  });
}
