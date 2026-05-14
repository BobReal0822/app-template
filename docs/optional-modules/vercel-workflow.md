# Vercel Workflow SDK

Use when: a unit of work spans multiple steps, must survive cold starts
and crashes, can pause for external events (webhooks, human review), or
needs durable retries with backoff. The classic case is media generation:
enqueue → call provider → poll/wait for webhook → persist result →
notify user.

## Install

```bash
pnpm add @workflow/next workflow
```

## Wire `next.config.js`

```js
const withNextIntl = require('next-intl/plugin')();
const { withWorkflow } = require('@workflow/next');

module.exports = withWorkflow(withNextIntl(config));
```

## Wire `middleware.ts`

The Workflow runtime POSTs to `/.well-known/workflow/v1/...`. next-intl
must NOT proxy those routes — add the path to your matcher exclusions:

```ts
export const config = {
  matcher: [
    '/',
    '/(en|zh)/:path*',
    '/((?!api|_vercel|_next/static|_next/image|favicon.ico|\\.well-known/workflow/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|webmanifest|xml|txt|ico)$).*)',
  ],
};
```

## Define a workflow

```ts
// src/workflows/example.ts
import { workflow, step } from 'workflow';

export const generateImage = workflow('generate-image', async (input: {
  uid: string;
  prompt: string;
}) => {
  const taskId = await step('enqueue-fal', async () =>
    enqueueFalRequest(input.prompt),
  );

  const result = await step('await-webhook', async () =>
    waitForWebhook(taskId),
  );

  await step('persist-r2', async () => persistToR2(result));
  await step('notify', async () => sendDoneEmail(input.uid));
});
```

## Trigger it from a Route Handler

```ts
// src/app/api/generate/route.ts
import { generateImage } from '@/workflows/example';

export async function POST(req: Request) {
  const body = await req.json();
  await generateImage.start({ uid: body.uid, prompt: body.prompt });
  return new Response(null, { status: 202 });
}
```

## Notes

- The runtime stores step results so a re-entrant invocation skips
  completed steps. Make every `step()` body idempotent — if it must
  insert into the DB, use the `idempotency_keys` table or
  `INSERT ... ON CONFLICT DO NOTHING`.
- Pair workflows with the `@vercel/queue` queue for the initial trigger
  envelope, so a failure to enqueue does not lose the request.
- See `vercel.json` for the per-route `maxDuration` you'll likely want
  to bump on long-running steps.
