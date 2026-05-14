# Realtime SSE channels

Use when: you need to push updates to a logged-in user without a
WebSocket — examples: "your image is ready", "credits topped up", "new
notification", live cursor positions in a doc editor (with caveats).

## What's already in the template

- `src/server/realtime/publish.ts` — `publish(channel, payload)` writes
  to a Redis channel.
- `src/server/realtime/sse.ts` — `createSseStream({ channel })` returns
  a `ReadableStream` for use in a Route Handler.
- `src/lib/realtime/client.ts` — browser-side `EventSource` wrapper with
  reconnect + typed payloads.
- `ioredis` driver, configured via `REDIS_URL` (separate from the
  Upstash REST client used for idempotency / cache).

## Add a per-user channel route

```ts
// src/app/api/realtime/me/route.ts
import { NextRequest } from 'next/server';
import { requireUser } from '@/server/api/auth';
import { createSseStream } from '@/server/realtime/sse';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const { uid } = await requireUser();
  const stream = createSseStream({ channel: `user:${uid}` });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
```

## Server-side publish

```ts
import { publish } from '@/server/realtime/publish';

await publish(`user:${uid}`, {
  type: 'media-ready',
  data: { mediaId, url },
});
```

## Update `vercel.json`

The function needs a longer max duration than the default and slightly
more memory:

```json
{
  "src/app/api/realtime/**/route.ts": {
    "maxDuration": 300,
    "memory": 512
  }
}
```

## Caveats

- Vercel functions have an absolute lifetime (currently 300s on Pro+).
  The client must reconnect; the included client wrapper does this with
  exponential backoff.
- For high-fanout broadcasts (10K+ subscribers) consider a managed
  service (Ably, Pusher) instead of running fanout from a Function.
