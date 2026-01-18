import { env } from "../config/env";
import { mockGenerate } from "./mock";
import { geminiGenerate } from "./gemini";
import { ArtifactType, LLMResult, WorkflowInput } from "./types";

export async function generateWithLLM(
  type: ArtifactType,
  input: WorkflowInput,
): Promise<LLMResult> {
  const provider = (env.LLM_PROVIDER || "gemini").toLowerCase();

  if (provider === "gemini") {
    return geminiGenerate(type, input);
  }

  if (provider === "mock") {
    return mockGenerate(type, input);
  }

  // Fallback
  return {
    outputText: `LLM provider "${provider}" not supported. Use 'gemini' or 'mock'.`,
    meta: { model: provider },
  };
}
