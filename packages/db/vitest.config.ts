import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Pure Node tests against a real Neon dev branch — no DOM, no jsdom.
    environment: 'node',

    // Test files live next to source under `test/` for clarity (mirrors
    // `src/`). We keep `.test.ts` only — `.spec.ts` is reserved for any
    // Playwright-style files that might appear later.
    include: ['test/**/*.test.ts'],

    // Load .env.local first (per-developer dev branch override) then
    // .env.development.local (Vercel marketplace fallback). dotenv does NOT
    // override existing env vars, so .env.local values stick. Mirrors the
    // resolution order in `packages/db/src/client.ts`.
    setupFiles: ['./test/setup-env.ts'],

    // Tests INSERT against a real Neon branch and rely on BEGIN/ROLLBACK to
    // stay isolated. Running a single thread (vitest 4: top-level fields)
    // keeps that contract clean and avoids interleaving with the
    // concurrent-deduct test that *intentionally* races two requests
    // against the same row.
    fileParallelism: false,
    pool: 'threads',
    minWorkers: 1,
    maxWorkers: 1,

    // Real-DB tests can take a few seconds for the first connection.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
