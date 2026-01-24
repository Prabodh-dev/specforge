import { GoogleGenAI } from "@google/genai";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function geminiGenerate(opts: {
  prompt: string;
  jsonSchema?: any;
}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL || "gemini-2.0-flash";

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey });

      const res = await ai.models.generateContent({
        model,
        contents: opts.prompt,
        config: opts.jsonSchema
          ? {
              responseMimeType: "application/json",
              responseJsonSchema: opts.jsonSchema,
            }
          : { responseMimeType: "application/json" },
      });

      return res.text ?? "";
    } catch (error: any) {
      const status = error?.status || error?.statusCode;
      const isRateLimit = status === 429;
      const isLastAttempt = attempt === MAX_RETRIES - 1;

      if (isRateLimit && !isLastAttempt) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Gemini Worker] Rate limited (429). Retry ${attempt + 1}/${MAX_RETRIES} after ${delay}ms`,
          error?.message,
        );
        await sleep(delay);
        continue;
      }

      console.error("[Gemini Worker] Error:", error?.message);
      throw error;
    }
  }

  throw new Error("[Gemini] Failed after max retries");
}
