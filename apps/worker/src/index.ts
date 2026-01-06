import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

console.log("[worker] booted");
console.log("[worker] REDIS_URL =", process.env.REDIS_URL ? "set" : "not set");

setInterval(() => {}, 60_000);
