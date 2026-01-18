import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export const LLM_QUEUE_NAME = "llm-runs";
const connection = getRedisConnection();

export const llmQueue = connection
  ? new Queue(LLM_QUEUE_NAME, { connection })
  : null;

export async function enqueueLLMRun(llmRunId: string) {
  if (!llmQueue) {
    console.warn("[llm] Queue not available - Redis not connected");
    return;
  }
  await llmQueue.add(
    "process",
    { llmRunId },
    {
      attempts: 3,
      backoff: { type: "exponential", delay: 3000 },
      removeOnComplete: 500,
      removeOnFail: 500,
    }
  );
}
