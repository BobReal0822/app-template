# `@repo/db`

Drizzle ORM schema, Neon Postgres clients, and authorization helpers.

Consumed by the Next.js app under `src/` (Vercel / Node.js 24) and any
local scripts or tests in this monorepo.

## Why a workspace package

Centralizes schema definitions, migrations, and authorization helpers so
every server entrypoint in this repo shares one database source of truth.

## Public surface

```ts
import {
  getDbHttp,
  getDbTransaction,
  withUserScope,
  requireOwnership,
} from '@repo/db';
import { users, creditGrants, feedbacks } from '@repo/db/schema';
```

| Module                    | Use it for                                                     |
| ------------------------- | -------------------------------------------------------------- |
| `getDbHttp()`             | 99% of read/write paths — pooled HTTP driver, zero overhead.   |
| `getDbTransaction()`      | Long transactions, multi-statement atomic units, migrations.  |
| `withUserScope(uid, fn)`  | Builds `uid = $uid` filters for row-level user scoping.        |
| `requireOwnership({...})` | Single-row lookup that throws `NOT_FOUND_OR_FORBIDDEN` if 0.   |

The naming axis is *use case* (HTTP one-shot vs. Transaction-capable), not
"pooled vs unpooled". `getDbHttp` connects via Neon's PgBouncer endpoint
(`POSTGRES_URL`); `getDbTransaction` connects directly
(`POSTGRES_URL_NON_POOLING`) because PgBouncer's transaction-pooling mode
breaks the session state that multi-statement transactions need. See the
header of `src/client.ts` for the full rationale.

`withUserScope` and `requireOwnership` encode the application's row-level
ownership rules — see `src/authz.ts` and the call sites in `src/server/`.

## Tables shipped with the template

| Table                   | Purpose                                                |
| ----------------------- | ------------------------------------------------------ |
| `users`                 | Domain profile keyed by auth `uid`. Holds plan + credit balance. |
| `credit_grants`         | Append-only ledger of subscription credit issuance.    |
| `feedbacks`             | In-app user feedback.                                  |
| `idempotency_keys`      | Webhook / queue idempotency keys with TTL.             |
| `login_logs`            | Append-only audit of login events.                     |
| `pending_registrations` | Email-verification handshake state.                    |
| `auth_audit_logs`       | Auth events audit trail.                               |
| `auth_*` (5 tables)     | Better-auth managed: `auth_user`, `auth_session`, `auth_account`, `auth_verification`, `auth_audit_logs`. |

Add your own domain tables to `src/schema/<your-table>.ts` and re-export
them from `src/schema/index.ts`.

## Scripts

| Script                           | Purpose                                                 |
| -------------------------------- | ------------------------------------------------------- |
| `pnpm -F @repo/db generate`       | Generate a SQL migration from schema diff.              |
| `pnpm -F @repo/db migrate`        | Apply pending migrations against `POSTGRES_URL_NON_POOLING`. |
| `pnpm -F @repo/db studio`         | Launch Drizzle Studio.                                  |
| `pnpm -F @repo/db check`          | Type-check this package.                                |
| `pnpm -F @repo/db test`           | Vitest (unit + optional integration against a Neon dev branch). |

For day-to-day work prefer the root scripts (`pnpm db:generate`, etc.) which
load `.env.local` automatically via `dotenv-cli`.

## First-time setup against a fresh Neon branch

1. Create a Neon project and a `dev-<handle>` branch. Put the connection
   strings in `.env.local` at the repo root:

   ```ini
   POSTGRES_URL=postgres://...                # pooled (PgBouncer)
   POSTGRES_URL_NON_POOLING=postgres://...    # direct (no pooler)
   ```

2. Generate the initial migration from the kept schemas, then apply it:

   ```bash
   pnpm db:generate    # writes packages/db/drizzle/migrations/0000_*.sql
   pnpm db:migrate     # applies it
   ```

3. Apply the `set_updated_at` triggers (Drizzle does not declare DB
   triggers in TS schemas):

   ```bash
   psql "$POSTGRES_URL_NON_POOLING" \
     -f packages/db/drizzle/manual/0001_setup_updated_at_triggers.sql
   ```

   Or copy that file into `packages/db/drizzle/migrations/` (renaming the
   prefix to `0001_…`) BEFORE running `pnpm db:migrate` so it gets applied
   in the same pass.

4. Sanity-check the schema:

   ```bash
   pnpm db:verify
   ```

5. Optional, for tests against a real branch:

   ```bash
   pnpm -F @repo/db test
   ```

## Branch convention

| Branch                 | Used by                          |
| ---------------------- | -------------------------------- |
| `main`                 | Vercel `production`.             |
| `dev-ci`               | CI runs and Vercel `preview`.    |
| `dev-<github-handle>`  | Each developer's local sandbox.  |
