import { defineConfig } from 'drizzle-kit';

// `drizzle-kit generate` does not actually open a connection — it only diffs
// the TS schema against `./drizzle/migrations`. But `defineConfig`'s type
// signature for the `postgresql` dialect still requires `dbCredentials.url:
// string` at compile time. Rather than satisfy the type with a fake host, we
// fail fast — same policy as `packages/db/src/client.ts` / `migrate.ts` /
// `verify.ts` (no Marketplace `DB_*` fallback, no generic `DATABASE_URL`
// fallback, no silent placeholder).
//
// All `db:*` scripts in the repo root load `.env.local` via `dotenv-cli`
// before invoking drizzle-kit, so this branch is only reached when someone
// runs `drizzle-kit` by hand without env exported, which is operator error.
const url = process.env.POSTGRES_URL_NON_POOLING;
if (!url) {
  throw new Error(
    'POSTGRES_URL_NON_POOLING is required for drizzle-kit. ' +
      'Run via `pnpm db:generate` / `pnpm db:studio` (which auto-load `.env.local`), ' +
      'or export it manually in your shell.',
  );
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
  verbose: true,
  breakpoints: true,
});
