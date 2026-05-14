# AI SDK + AI Gateway

Use when: you need an LLM (chat, structured output, agents, tool calls,
RAG). Vercel's AI Gateway gives you a unified endpoint, automatic
fallbacks, and observability across providers without juggling provider
SDKs.

## Install

```bash
pnpm add ai @ai-sdk/react
```

You do **not** need provider-specific packages (`@ai-sdk/anthropic`,
`@ai-sdk/openai`, …) — pass the model as a `"provider/model"` string and
the AI Gateway will route. See
[`.cursor/rules/vercel-ai-sdk-integration-rules.mdc`](../../.cursor/rules/vercel-ai-sdk-integration-rules.mdc).

## Env

```ini
# Set in Vercel project (and .env.local for development)
AI_GATEWAY_API_KEY=
```

The accessor lives next to the other secrets in
`src/server/lib/secrets.ts` — add a typed getter if you read it from more
than one place.

## Server: streaming text

```ts
// src/app/api/chat/route.ts
import { streamText } from 'ai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = await streamText({
    model: 'anthropic/claude-3-5-sonnet-latest',
    messages,
  });
  return result.toDataStreamResponse();
}
```

## Server: structured output (Zod)

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const Plan = z.object({
  steps: z.array(z.object({ title: z.string(), eta: z.number() })),
});

const { object } = await generateObject({
  model: 'openai/gpt-5-mini',
  schema: Plan,
  prompt: 'Outline a 5-step product launch plan.',
});
```

## Client: chat hook

```tsx
'use client';
import { useChat } from '@ai-sdk/react';

export function Chat() {
  const { messages, input, handleSubmit, handleInputChange } = useChat({
    api: '/api/chat',
  });

  return (
    <form onSubmit={handleSubmit}>
      {messages.map((m) => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <input value={input} onChange={handleInputChange} />
    </form>
  );
}
```

## Notes

- For credit metering, deduct *before* the request fires (atomic) and
  refund on stream error. The credits primitives in `@app/db/credits`
  already give you the safe SQL for both directions.
- Don't forget `export const runtime = 'nodejs'` on the route — Edge
  loses streaming response back-pressure on long generations.
