import dotenv from "dotenv";
dotenv.config();

console.log("[worker] booted");
console.log("[worker] REDIS_URL =", process.env.REDIS_URL ? "set" : "not set");

setInterval(() => {}, 60_000);
