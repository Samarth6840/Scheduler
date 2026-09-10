import { Redis } from "ioredis";
import { env } from "./env.js";

export const redis = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

redis.on("error", (err) => {
  console.error("[redis] error:", err.message);
});
