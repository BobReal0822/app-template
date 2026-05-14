# Optional modules

The base template ships with the SaaS plumbing (auth, billing, queues,
cron, R2, email, i18n) and nothing else. The integrations below were part
of the source codebase but are kept out of the default template so the
install stays small and unopinionated.

Each guide names the deps to add, the files to create, and the wiring
needed in `next.config.js`, `vercel.json`, or `middleware.ts`.

| Module                                          | When to add it                                                              |
| ----------------------------------------------- | --------------------------------------------------------------------------- |
| [`ai-sdk.md`](./ai-sdk.md)                      | Any LLM / chat / structured-output / RAG feature.                           |
| [`vercel-workflow.md`](./vercel-workflow.md)    | Long-running, resumable, retry-safe workflows (image gen, video pipelines). |
| [`fal-provider.md`](./fal-provider.md)          | Image / video / audio generation via fal.ai with signed webhooks.           |
| [`gcs-storage.md`](./gcs-storage.md)            | Add Google Cloud Storage as a second backend alongside R2.                  |
| [`blog-system.md`](./blog-system.md)            | MDX-driven content tree (`/blog`, sitemap, RSS).                            |
| [`og-image-build.md`](./og-image-build.md)      | Build-time pre-rendered OG images via `scripts/build-og-images.ts`.         |
| [`realtime-sse.md`](./realtime-sse.md)          | Per-user SSE channels backed by Redis pub/sub.                              |

If you carry an integration over from the upstream codebase, add a guide
here so the next person knows it's intentionally optional.
