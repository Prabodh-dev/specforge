import { ollamaGenerate } from "./ollama";

export async function llmGenerate(opts: { prompt: string; jsonSchema?: any }) {
  const provider = (process.env.LLM_PROVIDER || "ollama").toLowerCase();

  if (provider === "ollama") {
    return ollamaGenerate({
      prompt: opts.prompt,
      jsonSchema: opts.jsonSchema,
    });
  }

  throw new Error(`Unsupported LLM_PROVIDER: ${provider}. Use 'ollama'.`);
}
