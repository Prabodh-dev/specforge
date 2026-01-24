import { GoogleGenAI } from "@google/genai";
import { ArtifactType, LLMResult, WorkflowInput } from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geminiGenerate(
  type: ArtifactType,
  input: WorkflowInput,
): Promise<LLMResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  const isJsonType = [
    "USER_STORIES",
    "OPENAPI",
    "DB_SCHEMA",
    "TASK_BREAKDOWN",
  ].includes(type);

  const prompt = buildPrompt(type, input);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model,
        contents: prompt,
        config: isJsonType
          ? {
              responseMimeType: "application/json",
            }
          : undefined,
      });

      const text = res.text ?? "";

      if (isJsonType) {
        try {
          const json = JSON.parse(text);
          return {
            outputJson: json,
            meta: {
              model,
              inputTokens: res.usageMetadata?.promptTokenCount,
              outputTokens: res.usageMetadata?.candidatesTokenCount,
              latencyMs: 0,
              costUsd: 0,
            },
          };
        } catch {
          return {
            outputText: text,
            meta: {
              model,
              inputTokens: res.usageMetadata?.promptTokenCount,
              outputTokens: res.usageMetadata?.candidatesTokenCount,
              latencyMs: 0,
              costUsd: 0,
            },
          };
        }
      }

      return {
        outputText: text,
        meta: {
          model,
          inputTokens: res.usageMetadata?.promptTokenCount,
          outputTokens: res.usageMetadata?.candidatesTokenCount,
          latencyMs: 0,
          costUsd: 0,
        },
      };
    } catch (error: any) {
      const status = error?.status || error?.statusCode;
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Gemini] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          error?.message,
        );
        await sleep(delay);
        continue;
      }

      console.error("[Gemini] Error:", error?.message);
      throw error;
    }
  }

  throw new Error("[Gemini] Failed after max retries");
}

function buildPrompt(type: ArtifactType, input: WorkflowInput): string {
  const base = `You are a professional product specification writer. Generate a high-quality ${type} based on the following:

Product Idea: ${input.idea}
${input.targetUsers ? `Target Users: ${input.targetUsers}` : ""}
${input.constraints && input.constraints.length ? `Constraints:\n${input.constraints.map((c) => `- ${c}`).join("\n")}` : ""}
${input.techStack && input.techStack.length ? `Tech Stack:\n${input.techStack.map((t) => `- ${t}`).join("\n")}` : ""}
${input.notes ? `Additional Notes: ${input.notes}` : ""}

Generate professional, industry-grade output.`;

  if (type === "PRD") {
    return `${base}

Format as a structured PRD with sections: Overview, Problem Statement, Solution, Target Users, Goals, Non-Goals, Success Metrics, and Timeline.`;
  }

  if (type === "USER_STORIES") {
    return `${base}

Generate user stories in the format:
As a [user type], I want to [action] so that [benefit].
- Acceptance Criteria: [specific testable criteria]

Include at least 5 user stories.`;
  }

  if (type === "API_SPEC") {
    return `${base}

Generate a complete OpenAPI 3.0.3 specification in JSON format with:
- info, servers, paths, components/schemas
- At least 5 endpoints covering main workflows
- Proper request/response schemas
- Authentication (Bearer token)

Output ONLY valid JSON, no markdown.`;
  }

  if (type === "DB_SCHEMA") {
    return `${base}

Generate a database schema in JSON format with:
- tables array with name, description, columns
- Each column: name, type, nullable, description
- relationships if applicable
- indexes for performance

Output ONLY valid JSON, no markdown.`;
  }

  if (type === "TASK_BREAKDOWN") {
    return `${base}

Generate engineering tasks in JSON format with:
- tasks array with id, title, description, estimatedHours, dependencies
- Group by feature or component
- Include testing and deployment tasks

Output ONLY valid JSON, no markdown.`;
  }

  return base;
}
