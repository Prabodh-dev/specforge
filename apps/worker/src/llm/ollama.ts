const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const BASE_URL = (
  process.env.OLLAMA_BASE_URL || "https://ollama.com/api"
).replace(/\/$/, "");
const API_KEY = process.env.OLLAMA_API_KEY;
const MODEL = process.env.OLLAMA_MODEL || "gpt-oss:120b";

interface OllamaRequest {
  model: string;
  messages: Array<{ role: "system" | "user"; content: string }>;
  stream: boolean;
  format?: "json" | string;
}

interface OllamaResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  total_duration: number;
  prompt_eval_count: number;
  eval_count: number;
}

export async function ollamaGenerate(opts: {
  prompt: string;
  jsonSchema?: any;
}): Promise<string> {
  if (!API_KEY) throw new Error("OLLAMA_API_KEY not set");

  const systemMsg = opts.jsonSchema
    ? "You are a technical assistant. Return ONLY valid JSON with no markdown, no explanation, no additional text."
    : "You are a technical writing assistant. Provide clear, well-structured output.";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const requestBody: OllamaRequest = {
        model: MODEL,
        messages: [
          { role: "system", content: systemMsg },
          { role: "user", content: opts.prompt },
        ],
        stream: false,
      };

      if (opts.jsonSchema) {
        requestBody.format = "json";
      }

      const response = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const status = response.status;
        const errorData = await response.text();

        if (status === 429) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(
            `[Ollama Worker] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          );
          await sleep(delay);
          continue;
        }

        throw new Error(`Ollama API error ${status}: ${errorData}`);
      }

      const data = (await response.json()) as OllamaResponse;
      return data.message.content.trim();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Ollama Worker] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          error?.message,
        );
        await sleep(delay);
        continue;
      }

      console.error("[Ollama Worker] Error:", error?.message);
      throw error;
    }
  }

  throw new Error("[Ollama] Failed after max retries");
}
