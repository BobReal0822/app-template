# Google Cloud Storage backend

Use when: a downstream provider only accepts a `gs://bucket/key` URI
(common for Google Vertex / Speech / Video Intelligence / Gemini File
APIs), or you need a regional EU/APAC bucket alongside R2 for residency.

## Install

```bash
pnpm add @google-cloud/storage
```

If you also use Video Intelligence:

```bash
pnpm add @google-cloud/video-intelligence
```

## Wire `next.config.js`

These libs use Node-only APIs (HTTP, gaxios, googleapis). Mark them as
`serverExternalPackages` so the bundler doesn't trace them into Edge or
Server Component bundles:

```js
const config = {
  serverExternalPackages: [
    '@google-cloud/storage',
    '@google-cloud/video-intelligence',
    'google-auth-library',
    'gaxios',
    'https-proxy-agent',
    'agent-base',
  ],
  // ...
};
```

## Env

```ini
GCS_BUCKET=
# Full one-line service-account JSON (mark Sensitive). Avoid
# `GOOGLE_APPLICATION_CREDENTIALS=path/to/file.json` on Vercel — there
# is no filesystem to point at.
GCP_SERVICE_ACCOUNT_JSON=
```

## Skeleton

Drop a `src/lib/storage/gcs.ts` next to `r2.ts` exposing the same surface
(`uploadToGcs`, `uploadUrlToGcs`, `downloadFromGcs`, `getGcsUri`), then
re-export it from `src/lib/storage/index.ts`:

```ts
export { uploadToGcs, uploadUrlToGcs, downloadFromGcs, getGcsUri } from './gcs';
export type { GcsUploadResult } from './types';
```

## R2 → GCS staging

For pipelines that need to feed an R2 asset into a Google API, copy via a
buffered stream rather than re-downloading client-side. The original
codebase had `src/server/lib/copy-r2-to-gcs.ts` — re-introduce it when
needed.
