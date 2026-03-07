/**
 * Cache Utility - In-memory + Redis caching layer
 *
 * Provides a two-tier cache: fast in-memory Map with TTL, backed by Redis
 * when available. Falls back gracefully to memory-only if Redis is down.
 * Used for frequently-accessed data like carrier lookups, user sessions,
 * and report queries.
 *
 * Location: apps/api/src/utils/cache.ts
 */
import { env } from '../config/env';
import { logger } from './logger';

/** In-memory TTL cache for sub-millisecond reads */
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

let redisClient: any = null;

/** Initialize Redis connection if REDIS_URL is set */
export async function initCache(): Promise<void> {
  if (!env.REDIS_URL) {
    logger.info('No REDIS_URL configured — using memory-only cache');
    return;
  }

  try {
    const { createClient } = await import('redis');
    redisClient = createClient({ url: env.REDIS_URL });
    redisClient.on('error', (err: Error) => logger.warn({ err }, 'Redis connection error'));
    await redisClient.connect();
    logger.info('Redis cache connected');
  } catch (err) {
    logger.warn({ err }, 'Redis unavailable — falling back to memory cache');
    redisClient = null;
  }
}

/**
 * Get a cached value. Checks memory first, then Redis.
 * Returns null if not found or expired.
 */
export async function cacheGet<T = string>(key: string): Promise<T | null> {
  // Check in-memory first
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return JSON.parse(mem.value) as T;
  }
  memoryCache.delete(key);

  // Check Redis
  if (redisClient) {
    try {
      const val = await redisClient.get(key);
      if (val) {
        memoryCache.set(key, { value: val, expiresAt: Date.now() + 30_000 });
        return JSON.parse(val) as T;
      }
    } catch {
      // Redis miss or error — proceed without cache
    }
  }

  return null;
}

/**
 * Set a cached value in both memory and Redis.
 * @param ttlSeconds - Time to live in seconds (default 300 = 5 min)
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const serialized = JSON.stringify(value);

  memoryCache.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });

  if (redisClient) {
    try {
      await redisClient.setEx(key, ttlSeconds, serialized);
    } catch {
      // Silently continue — memory cache still works
    }
  }
}

/** Delete a specific key from both caches */
export async function cacheDel(key: string): Promise<void> {
  memoryCache.delete(key);
  if (redisClient) {
    try { await redisClient.del(key); } catch { /* noop */ }
  }
}

/** Delete all keys matching a prefix (e.g., "claims:*") */
export async function cacheInvalidate(prefix: string): Promise<void> {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }

  if (redisClient) {
    try {
      const keys = await redisClient.keys(`${prefix}*`);
      if (keys.length > 0) await redisClient.del(keys);
    } catch { /* noop */ }
  }
}

/** Periodic cleanup of expired memory cache entries (runs every 60s) */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of memoryCache) {
    if (entry.expiresAt <= now) memoryCache.delete(key);
  }
}, 60_000);
