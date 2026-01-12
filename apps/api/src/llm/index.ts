import { env } from "../config/env";
import { mockGenerate } from "./mock";
import { ArtifactType, LLMResult, WorkflowInput } from "./types";

export async function generateWithLLM(
  type: ArtifactType,
  input: WorkflowInput
): Promise<LLMResult> {
  // For now, only mock is implemented. Later we plug OpenAI/Gemini here.
  if (env.LLM_PROVIDER === "mock") {
    return mockGenerate(type, input);
  }

  // Placeholder so your API doesn’t crash:
  // You can implement openai/gemini later without changing controllers/routes.
  return {
    outputText: `LLM provider "${env.LLM_PROVIDER}" not implemented yet. Switch LLM_PROVIDER=mock for now.`,
    meta: { model: env.LLM_PROVIDER },
  };
}
