import { ArtifactType, LLMResult, WorkflowInput } from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream: boolean;
  temperature?: number;
  format?: "json" | string;
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration: number;
  load_duration: number;
  prompt_eval_count: number;
  eval_count: number;
}

export async function ollamaGenerate(
  type: ArtifactType,
  input: WorkflowInput,
): Promise<LLMResult> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY not set");

  const baseUrl = (
    process.env.OLLAMA_BASE_URL || "https://ollama.com/api"
  ).replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "gpt-oss:120b";

  const isJsonType = [
    "USER_STORIES",
    "API_SPEC",
    "DB_SCHEMA",
    "TASK_BREAKDOWN",
  ].includes(type);

  const prompt = buildPrompt(type, input);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const systemMsg = isJsonType
        ? "You are a technical assistant. Return ONLY valid JSON with no markdown, no explanation, no additional text."
        : "You are a technical writing assistant. Provide clear, well-structured output.";

      const userMsg =
        typeof prompt === "string" ? prompt : JSON.stringify(prompt);

      const requestBody: OllamaRequest = {
        model,
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: userMsg },
        ],
        stream: false,
        temperature: 0.7,
      };

      if (isJsonType) {
        requestBody.format = "json";
      }

      const response = await fetch(`${baseUrl}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.text();
        const status = response.status;

        if (status === 429) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[Ollama] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }

        throw new Error(`Ollama API error ${status}: ${errorData}`);
      }

      const data = (await response.json()) as OllamaResponse;
      const text = data.message.content.trim();

      if (isJsonType) {
        try {
          const json = JSON.parse(text);
          return {
            outputJson: json,
            meta: {
              model,
              inputTokens: data.prompt_eval_count,
              outputTokens: data.eval_count,
              latencyMs: Math.round(data.total_duration / 1_000_000), // Convert nanoseconds to ms
              costUsd: 0, // Ollama typically has no per-token cost
            },
          };
        } catch (parseError) {
          console.warn("[Ollama] JSON parse failed, returning raw text", text);
          return {
            outputText: text,
            meta: {
              model,
              inputTokens: data.prompt_eval_count,
              outputTokens: data.eval_count,
              latencyMs: Math.round(data.total_duration / 1_000_000),
              costUsd: 0,
            },
          };
        }
      }

      return {
        outputText: text,
        meta: {
          model,
          inputTokens: data.prompt_eval_count,
          outputTokens: data.eval_count,
          latencyMs: Math.round(data.total_duration / 1_000_000),
          costUsd: 0,
        },
      };
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Ollama] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          error?.message,
        );
        await sleep(delay);
        continue;
      }

      console.error("[Ollama] Error:", error?.message);
      throw error;
    }
  }

  throw new Error("[Ollama] Failed after max retries");
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

/**
 * Health check for Ollama provider
 */
export async function ollamaHealthCheck(): Promise<{
  status: "ok" | "error";
  message: string;
  model?: string;
}> {
  try {
    const apiKey = process.env.OLLAMA_API_KEY;
    const baseUrl = (
      process.env.OLLAMA_BASE_URL || "https://ollama.com/api"
    ).replace(/\/$/, "");
    const model = process.env.OLLAMA_MODEL || "gpt-oss:120b";

    if (!apiKey) {
      return { status: "error", message: "OLLAMA_API_KEY not configured" };
    }

    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "reply with OK" }],
        stream: false,
      }),
    });

    if (!response.ok) {
      return {
        status: "error",
        message: `Ollama API returned ${response.status}`,
        model,
      };
    }

    const data = (await response.json()) as OllamaResponse;
    const responseText = data.message?.content || "";

    if (responseText.toUpperCase().includes("OK")) {
      return { status: "ok", message: "Ollama provider healthy", model };
    }

    return {
      status: "ok",
      message: "Ollama provider responding",
      model,
    };
  } catch (error: any) {
    return {
      status: "error",
      message: `Ollama health check failed: ${error?.message}`,
    };
  }
}
