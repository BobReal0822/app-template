# `src/server/dto/` — wire-format DTOs (server ↔ client contract)

Replaces the per-query `Data` / `Variables` types from the legacy generated
client. Conventions below are the contract for handler ↔ UI alignment.

## Conventions

- **Field naming** — `camelCase` (matches the historical wire format and every
  current frontend callsite, so handler / hook code requires zero rename).
- **UUIDs** — hyphenated `string` (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`).
  drizzle's `uuid()` column emits hyphenated UUIDs by default, so no
  UUID normalization calls are needed in conversion functions where the column
  is native `uuid`.
- **Dates** — ISO-8601 `string` on the wire (e.g. `2026-04-24T16:42:37.123Z`).
  drizzle returns `Date` objects (we configured `mode: 'date'`); the
  `*RowToDto` helpers are responsible for the explicit `.toISOString()`.
- **Nullability** — `T | null` (single nullable, NOT `T | null | undefined`
  duplicated like the old API). Drizzle-emitted optionals come through as `null`,
  not `undefined`, so this matches what the DB actually produces.
- **Entity shape** — one canonical `XxxDto` per domain. List / detail / etc.
  projections are expressed as `Pick<XxxDto, ...>` to avoid drift. Inline
  the `Pick` at the call site for one-off projections; only promote to a
  named `XxxListItemDto` when ≥ 2 callers need the same shape.
- **Validation** — out of scope this round. Handler input is still narrowed
  manually via `typeof x === 'string'` (legacy pattern). A later pass will
  introduce zod when rewriting `services/credits.ts` and from there
  retro-fit the rest of the handlers.

## Frontend usage

The `src/server/` path is _server-side runtime_ — never `import` it from
client components. **`import type` is fine** because TypeScript erases
type-only imports at compile time, leaving zero runtime cost in the client
bundle.

```ts
// ✅ in a client component / hook
import type { ProjectListItemDto } from '@/server/dto/project';

// ❌ would pull drizzle into the client bundle
import { projectRowToListItemDto } from '@/server/dto/project';
```

## Why not `src/shared/dto/`?

DTOs live under `src/server/dto/` so the contract stays server-owned — the conversion helpers
genuinely run server-side, only the `import type` surface is shared.
Promoting to a real shared workspace package (`packages/shared/`) is a
later choice we can make if we ever want multiple services / Next.js to
share types via `workspace:*`.
