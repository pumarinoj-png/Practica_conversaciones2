import { Redis } from "@upstash/redis";

const LIST_KEY = "feedbacks";

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function storeConfigured() {
  return getRedis() !== null;
}

export async function saveFeedback(record) {
  const redis = getRedis();
  if (!redis) return false;
  await redis.lpush(LIST_KEY, record);
  return true;
}

export async function listFeedbacks() {
  const redis = getRedis();
  if (!redis) return [];
  const items = await redis.lrange(LIST_KEY, 0, -1);
  return items.map((i) => (typeof i === "string" ? JSON.parse(i) : i));
}
