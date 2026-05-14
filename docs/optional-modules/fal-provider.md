# fal.ai provider + signed webhooks

Use when: you need image / video / audio generation from fal.ai models
(flux, kling, veo, sora, …). Long generations should always be webhook-
based — synchronous polling burns a function execution slot and times
out at 5 minutes on Vercel.

## Install

```bash
pnpm add @fal-ai/client
```

## Env

```ini
FAL_API_KEY=
# Random shared secret. Both your Vercel deployment AND any worker that
# verifies fal callbacks must hold the same value. DO NOT rotate while
# in-flight callbacks may use the old value — wait one max-callback
# window before flipping.
FAL_WEBHOOK_TOKEN=
```

Add typed accessors to `src/server/lib/secrets.ts`:

```ts
export const falApiKey = sensitive('FAL_API_KEY');
export const falWebhookToken = sensitive('FAL_WEBHOOK_TOKEN');
```

## Submit a job

```ts
// src/server/providers/fal/submit.ts
import { fal } from '@fal-ai/client';
import { falApiKey, falWebhookToken } from '@/server/lib/secrets';
import { getWebhookUrl } from '@/server/lib/webhook-url';

fal.config({ credentials: falApiKey.value() });

export async function submitImageJob(input: {
  prompt: string;
  taskId: string;
}) {
  return fal.queue.submit('fal-ai/flux/dev', {
    input: { prompt: input.prompt },
    webhookUrl: getWebhookUrl(`/api/webhooks/fal/image?token=${falWebhookToken.value()}&task=${input.taskId}`),
  });
}
```

## Webhook receiver

```ts
// src/app/api/webhooks/fal/image/route.ts
import { withIdempotency } from '@/server/lib/idempotency';
import { falWebhookToken } from '@/server/lib/secrets';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get('token') !== falWebhookToken.value()) {
    return new Response('forbidden', { status: 403 });
  }
  const taskId = url.searchParams.get('task');
  if (!taskId) return new Response('bad request', { status: 400 });

  const body = await req.json();

  return withIdempotency(`fal:image:${taskId}`, async () => {
    // 1. persist provider artifact (R2)
    // 2. update domain row
    // 3. publish realtime event for the user
    return new Response(null, { status: 204 });
  });
}
```

## Notes

- Always validate the token in a constant-time compare for production
  (use `@noble/hashes` `safeEqual` or `crypto.timingSafeEqual`).
- Don't trust the body for the user id — pass it in the URL token or
  look it up by `taskId` against your own row.
- If you also adopt the [Workflow SDK](./vercel-workflow.md), have the
  webhook resolve a `step('await-webhook')` instead of mutating the row
  directly.
