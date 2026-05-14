import { Redis } from '@upstash/redis';

let cachedRedis: Redis | null = null;

/**
 * Process-level Upstash Redis singleton.
 * Reuses one client per runtime process/module graph.
 */
export function getRedis(): Redis {
  if (!cachedRedis) {
    cachedRedis = Redis.fromEnv();
  }
  return cachedRedis;
}
