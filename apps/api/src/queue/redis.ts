import IORedis from "ioredis";
import { env } from "../config/env";

export function makeRedis() {
  // Upstash uses rediss://
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // required for BullMQ stability
    enableReadyCheck: false,
  });
}
