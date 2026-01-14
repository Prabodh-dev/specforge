import { Queue } from "bullmq";
import { makeRedis } from "./redis";

export const EXPORTS_QUEUE_NAME = "exports";

export const exportsQueue = new Queue(EXPORTS_QUEUE_NAME, {
  connection: makeRedis(),
});
