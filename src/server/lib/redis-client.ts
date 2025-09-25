// Production Redis client utility using Upstash REST API
import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  const url = process.env["UPSTASH_REDIS_REST_URL"];
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];

  if (!url || !token) {
    throw new Error(
      "Redis configuration required: Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN from your Upstash REST Redis console or project dashboard",
    );
  }

  try {
    redisClient = new Redis({ url, token });
    return redisClient;
  } catch (error) {
    throw new Error(
      `Redis connection failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// Production Redis operations (no fallback)
export async function redisGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  return await redis.get<T>(key);
}

export async function redisSet(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const redis = getRedisClient();
  if (ttlSeconds) {
    await redis.setex(key, ttlSeconds, value);
  } else {
    await redis.set(key, value);
  }
}

export async function redisDel(key: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(key);
}

export async function redisIncr(key: string, ttlSeconds?: number): Promise<number> {
  const redis = getRedisClient();
  const result = await redis.incr(key);
  if (ttlSeconds && result === 1) {
    await redis.expire(key, ttlSeconds);
  }
  return result;
}

export async function redisScan(
  pattern: string,
  cursor: number = 0,
  count: number = 100,
): Promise<{ cursor: number; keys: string[] }> {
  const redis = getRedisClient();
  const result = await redis.scan(cursor, { match: pattern, count });
  return {
    cursor: parseInt(result[0], 10),
    keys: result[1] as string[],
  };
}

export async function redisDelMultiple(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;
  const redis = getRedisClient();
  return await redis.del(...keys);
}
