import IORedis from "ioredis";

let redisClient: IORedis | null = null;

export function getRedisConnection() {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL || "";
  if (!url) {
    console.warn(
      "[redis] REDIS_URL/UPSTASH_REDIS_URL not set - queue features disabled",
    );
    return null;
  }

  if (redisClient) return redisClient;

  try {
    const isTls = url.startsWith("rediss://");
    redisClient = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: isTls ? {} : undefined,
      lazyConnect: true,
    });

    redisClient.on("error", (err) => {
      console.warn("[redis] Connection error:", err.message);
    });

    return redisClient;
  } catch (err: any) {
    console.warn("[redis] Failed to create connection:", err.message);
    return null;
  }
}
