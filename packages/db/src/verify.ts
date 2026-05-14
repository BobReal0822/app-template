// Sanity-check that a Neon branch has the expected schema applied.
// Usage: `pnpm db:verify` (root) → forwards to this script via dotenv.
//
// Verifies:
//   1. `pgcrypto` extension installed (required for `gen_random_uuid()`)
//   2. All expected tables present in `public` schema
//   3. `__drizzle_migrations` metadata table present (drizzle migrator ran here)
//   4. `set_updated_at` trigger present on tables that have an
//      app-managed `updated_at`. The `auth_*` tables are excluded because
//      better-auth bumps their `updatedAt` from application code; the other
//      kept tables are append-only.
//   5. `users.credits >= 0` CHECK constraint present in catalog
//   6. Smoke A: `SELECT gen_random_uuid()` returns a hyphenated UUID
//   7. Smoke B: INSERT users + ROLLBACK — proves writable connection works
//   8. Smoke C: INSERT users with credits=-1 is REJECTED — proves CHECK is enforced
//
// Exit code 0 on full pass, 1 on any failure (suitable for CI gating).

import { Pool } from '@neondatabase/serverless';

// `verify` opens a long-lived connection and runs DDL probes (CHECK constraint
// rejection, BEGIN/ROLLBACK around INSERTs). Must use the direct endpoint —
// PgBouncer transaction pooling would break smoke C's expected error path.
const url = process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error('[verify] missing POSTGRES_URL_NON_POOLING (direct Neon endpoint).');
  process.exit(1);
}

const EXPECTED_TABLES = [
  'auth_account',
  'auth_audit_logs',
  'auth_session',
  'auth_user',
  'auth_verification',
  'credit_grants',
  'feedbacks',
  'idempotency_keys',
  'login_logs',
  'pending_registrations',
  'users',
] as const;

// Tables that should have a `set_updated_at` BEFORE UPDATE trigger.
// Keep this explicit: append-only tables (credit_grants, login_logs,
// idempotency_keys, pending_registrations) and tables with app-managed
// `updatedAt` (the `auth_*` family, written by better-auth) are NOT here.
const EXPECTED_TRIGGER_TABLES = ['users', 'feedbacks'] as const;

type Check = { name: string; ok: boolean; detail: string };

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: url });
  const checks: Check[] = [];

  try {
    // 1. pgcrypto extension
    {
      const { rows } = await pool.query<{ extname: string }>(
        `SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'`,
      );
      checks.push({
        name: 'pgcrypto extension',
        ok: rows.length === 1,
        detail: rows.length === 1 ? 'installed' : 'NOT installed',
      });
    }

    // 2. all expected tables present
    {
      const { rows } = await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           ORDER BY table_name`,
      );
      const present = new Set(rows.map((r) => r.table_name));
      const missing = EXPECTED_TABLES.filter((t) => !present.has(t));
      const extra = [...present].filter(
        (t) => !EXPECTED_TABLES.includes(t as (typeof EXPECTED_TABLES)[number]) && t !== '__drizzle_migrations',
      );
      checks.push({
        name: `expected tables (${EXPECTED_TABLES.length} expected)`,
        ok: missing.length === 0,
        detail:
          missing.length === 0
            ? `all present${extra.length ? `, plus unexpected: ${extra.join(', ')}` : ''}`
            : `MISSING: ${missing.join(', ')}`,
      });
    }

    // 3. __drizzle_migrations metadata table (drizzle migrator default schema is `drizzle`)
    {
      const { rows } = await pool.query<{ table_schema: string }>(
        `SELECT table_schema FROM information_schema.tables
           WHERE table_name = '__drizzle_migrations'`,
      );
      const ok = rows.length > 0;
      checks.push({
        name: '__drizzle_migrations table',
        ok,
        detail: ok
          ? `present in schema(s): ${rows.map((r) => r.table_schema).join(', ')} (drizzle migrator initialized)`
          : 'NOT present (drizzle migrator never ran here)',
      });
    }

    // 4. set_updated_at_* triggers on 11 expected tables
    {
      const { rows } = await pool.query<{ event_object_table: string; trigger_name: string }>(
        `SELECT event_object_table, trigger_name
           FROM information_schema.triggers
           WHERE trigger_schema = 'public'
             AND action_statement LIKE '%set_updated_at%'
           ORDER BY event_object_table, trigger_name`,
      );
      const triggered = new Set(rows.map((r) => r.event_object_table));
      const missing = EXPECTED_TRIGGER_TABLES.filter((t) => !triggered.has(t));
      checks.push({
        name: `set_updated_at triggers (${EXPECTED_TRIGGER_TABLES.length} expected)`,
        ok: missing.length === 0,
        detail:
          missing.length === 0
            ? `all present on ${[...triggered].sort().join(', ')}`
            : `MISSING on: ${missing.join(', ')}`,
      });
    }

    // 5. users_credits_non_negative CHECK constraint
    {
      const { rows } = await pool.query<{ constraint_name: string; check_clause: string }>(
        `SELECT cc.constraint_name, cc.check_clause
           FROM information_schema.check_constraints cc
           JOIN information_schema.constraint_column_usage ccu
             ON cc.constraint_name = ccu.constraint_name
          WHERE ccu.table_schema = 'public'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'credits'`,
      );
      const found = rows.find((r) => /credits\s*>=\s*0/i.test(r.check_clause));
      checks.push({
        name: 'users.credits >= 0 CHECK constraint',
        ok: !!found,
        detail: found ? `found: ${found.constraint_name}` : 'NOT found',
      });
    }

    // 6. smoke A: gen_random_uuid() callable and returns hyphenated UUID
    {
      try {
        const { rows } = await pool.query<{ uuid: string }>(
          `SELECT gen_random_uuid()::text AS uuid`,
        );
        const v = rows[0]?.uuid ?? '';
        const ok = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
        checks.push({
          name: 'smoke A: SELECT gen_random_uuid()',
          ok,
          detail: ok ? `returned ${v}` : `returned unexpected shape: ${v}`,
        });
      } catch (e) {
        checks.push({
          name: 'smoke A: SELECT gen_random_uuid()',
          ok: false,
          detail: `threw: ${(e as Error).message}`,
        });
      }
    }

    // 7. smoke B: INSERT users (uid PK) + ROLLBACK
    //    Exercises the writable connection, the `created_at` / `updated_at` defaults,
    //    and (indirectly) the `users_credits_non_negative` CHECK constraint by writing
    //    a row with credits=0 (boundary-allowed value).
    {
      const probeUid = `verify-probe-${Date.now()}`;
      try {
        await pool.query(`BEGIN`);
        const { rows: inserted } = await pool.query<{
          uid: string;
          credits: number;
          created_at: Date;
          updated_at: Date;
        }>(
          `INSERT INTO users (uid, credits) VALUES ($1, 0)
             RETURNING uid, credits, created_at, updated_at`,
          [probeUid],
        );
        const row = inserted[0];
        const ok =
          inserted.length === 1 &&
          row?.uid === probeUid &&
          row?.credits === 0 &&
          row?.created_at instanceof Date &&
          row?.updated_at instanceof Date;
        await pool.query(`ROLLBACK`); // never persist the probe row
        checks.push({
          name: 'smoke B: INSERT users (rolled back)',
          ok,
          detail: ok
            ? `inserted uid=${row.uid} credits=${row.credits} (created_at + updated_at populated)`
            : 'insert returned unexpected shape',
        });
      } catch (e) {
        await pool.query(`ROLLBACK`).catch(() => {});
        checks.push({
          name: 'smoke B: INSERT users (rolled back)',
          ok: false,
          detail: `threw: ${(e as Error).message}`,
        });
      }
    }

    // 8. smoke C: CHECK constraint actually rejects negative credits
    {
      const probeUid = `verify-probe-neg-${Date.now()}`;
      try {
        await pool.query(`BEGIN`);
        await pool.query(`INSERT INTO users (uid, credits) VALUES ($1, -1)`, [probeUid]);
        await pool.query(`ROLLBACK`);
        checks.push({
          name: 'smoke C: CHECK rejects credits = -1',
          ok: false,
          detail: 'INSERT with credits=-1 unexpectedly succeeded — CHECK is NOT enforced',
        });
      } catch (e) {
        await pool.query(`ROLLBACK`).catch(() => {});
        const msg = (e as Error).message;
        const ok = /users_credits_non_negative|check constraint/i.test(msg);
        checks.push({
          name: 'smoke C: CHECK rejects credits = -1',
          ok,
          detail: ok ? `rejected as expected: ${msg.split('\n')[0]}` : `rejected but with unexpected error: ${msg}`,
        });
      }
    }
  } finally {
    await pool.end();
  }

  const padName = Math.max(...checks.map((c) => c.name.length));
  let allOk = true;
  console.log('\n[verify] schema sanity check on connected branch:\n');
  for (const c of checks) {
    if (!c.ok) allOk = false;
    const mark = c.ok ? 'PASS' : 'FAIL';
    console.log(`  [${mark}] ${c.name.padEnd(padName)}  ${c.detail}`);
  }
  console.log('');
  if (allOk) {
    console.log('[verify] ✅ all checks passed.');
    process.exit(0);
  }
  console.error('[verify] ❌ one or more checks failed.');
  process.exit(1);
}

main().catch((err) => {
  console.error('[verify] failed:', err);
  process.exit(1);
});
