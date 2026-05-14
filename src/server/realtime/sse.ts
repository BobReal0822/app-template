import Redis from 'ioredis';

import { REALTIME_RUNTIME } from '@/server/config/runtime';

export interface SseOptions {
  channels: string[];
  signal: AbortSignal;
  onConnect?: () => Promise<string | null>;
  onMessage?: (channel: string, message: string) => string | null;
}

export function createSseStream({
  channels,
  signal,
  onConnect,
  onMessage,
}: SseOptions): Response {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error('[realtime] REDIS_URL is not configured');
    return new Response('Realtime unavailable', { status: 503 });
  }

  const subscriber = new Redis(redisUrl);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await subscriber.subscribe(...channels);

        const initial = await onConnect?.();
        if (initial) {
          controller.enqueue(
            encoder.encode(`event: snapshot\ndata: ${initial}\n\n`),
          );
        }

        subscriber.on('message', (channel, rawMessage) => {
          const payload = onMessage?.(channel, rawMessage) ?? rawMessage;
          if (payload === null) return;
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        });

        const heartbeat = setInterval(() => {
          controller.enqueue(encoder.encode(': hb\n\n'));
        }, REALTIME_RUNTIME.SSE_HEARTBEAT_MS);

        signal.addEventListener('abort', () => {
          clearInterval(heartbeat);
          subscriber.disconnect();
          controller.close();
        });
      } catch (error) {
        subscriber.disconnect();
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}
