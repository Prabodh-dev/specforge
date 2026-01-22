import { Queue } from "bullmq";
import { getRedisConnection } from "./redis";

export const EXPORT_QUEUE_NAME = "exports";
const connection = getRedisConnection();

export const exportQueue = connection
  ? new Queue(EXPORT_QUEUE_NAME, { connection })
  : null;

export async function enqueueExport(exportId: string) {
  // If queue not constructed, bail out
  if (!exportQueue) {
    console.warn("[exports] Queue not available - Redis not connected");
    return false;
  }

  // Quick connectivity check: ensure Redis client is ready
  const conn: any = getRedisConnection();
  const status = conn?.status ?? "unknown";
  if (!conn || status !== "ready") {
    console.warn(
      `[exports] Redis status=${status} - falling back to direct processing`,
    );
    return false;
  }

  try {
    await exportQueue.add(
      "process",
      { exportId },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 3000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    );
    return true;
  } catch (err: any) {
    console.warn("[exports] Enqueue failed:", err?.message || err);
    return false;
  }
}
