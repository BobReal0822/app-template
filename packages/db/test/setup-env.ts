// Vitest setup file — runs once before any test file is loaded.
//
// Loads the workspace .env files in the same priority order as
// `packages/db/src/client.ts` so tests behave the same way as `pnpm db:*`
// scripts:
//   1. `.env.local`             (per-developer override, e.g. dev-yanis)
//   2. `.env.development.local` (Vercel-managed marketplace, DB_* prefix)
//
// dotenv does NOT overwrite already-set vars, so values from `.env.local`
// win. If neither file is present (e.g. fresh CI runner), individual tests
// that need a DB connection will be skipped via `describe.skipIf(...)`.

import { config as loadDotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');

loadDotenv({ path: resolve(repoRoot, '.env.local') });
loadDotenv({ path: resolve(repoRoot, '.env.development.local') });
