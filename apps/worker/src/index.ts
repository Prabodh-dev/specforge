import path from "path";
import dotenv from "dotenv";
import "./queues/llm.worker";
import { startExportWorker } from "./workers/export.worker";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

console.log("[worker] Starting workers...");
console.log("[worker] LLM worker online");

startExportWorker();
console.log("[worker] Export worker online");
