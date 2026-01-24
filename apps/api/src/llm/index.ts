import { env } from "../config/env";
import { mockGenerate } from "./mock";
import { ollamaGenerate, ollamaHealthCheck } from "./ollama";
import { ArtifactType, LLMResult, WorkflowInput } from "./types";

export async function generateWithLLM(
  type: ArtifactType,
  input: WorkflowInput,
): Promise<LLMResult> {
  const provider = (env.LLM_PROVIDER || "ollama").toLowerCase();

  if (provider === "ollama") {
    return ollamaGenerate(type, input);
  }

  if (provider === "mock") {
    return mockGenerate(type, input);
  }

  return {
    outputText: `LLM provider "${provider}" not supported. Use 'ollama' or 'mock'.`,
    meta: { model: provider },
  };
}

export async function checkLLMProvider(): Promise<{
  status: "ok" | "error";
  provider: string;
  message: string;
}> {
  const provider = (env.LLM_PROVIDER || "ollama").toLowerCase();

  try {
    if (provider === "ollama") {
      const health = await ollamaHealthCheck();
      return {
        status: health.status,
        provider: "ollama",
        message: health.message,
      };
    }

    if (provider === "mock") {
      return {
        status: "ok",
        provider: "mock",
        message: "Mock provider (no actual LLM calls)",
      };
    }

    return {
      status: "error",
      provider,
      message: `Unknown provider: ${provider}`,
    };
  } catch (error: any) {
    return {
      status: "error",
      provider,
      message: `Provider check failed: ${error?.message}`,
    };
  }
}
