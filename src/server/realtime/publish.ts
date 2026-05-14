import { getRedis } from '@/server/lib/redis';

const redis = getRedis();

export async function publishUpdate(
  channel: string,
  payload: unknown,
): Promise<void> {
  try {
    await redis.publish(channel, JSON.stringify(payload));
  } catch (error) {
    // Best-effort by design: clients recover from a fresh snapshot.
    console.warn('[realtime] publish failed', {
      channel,
      error,
    });
  }
}
