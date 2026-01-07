import { env } from "../config/env";
import { mockGenerate } from "./mock";
import { ArtifactType, LLMResult, WorkflowInput } from "./types";

export async function generateWithLLM(
  type: ArtifactType,
  input: WorkflowInput
): Promise<LLMResult> {
  if (env.LLM_PROVIDER === "mock") {
    return mockGenerate(type, input);
  }

  return {
    outputText: `LLM provider "${env.LLM_PROVIDER}" not implemented yet. Switch LLM_PROVIDER=mock for now.`,
    meta: { model: env.LLM_PROVIDER },
  };
}
