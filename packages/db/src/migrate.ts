// Apply pending drizzle-kit migrations against the URL in env.
// Usage: `pnpm db:migrate` (root) → forwards to this script via dotenv.
//
// Uses the WebSocket pool driver (not HTTP) because migrations include
// multi-statement DDL transactions that the HTTP driver cannot batch.

import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';

// Migrations run inside a multi-statement DDL transaction → must use the
// direct (non-pooling) endpoint. PgBouncer's transaction pooling mode breaks
// the WebSocket pool driver's session-level state.
const url = process.env.POSTGRES_URL_NON_POOLING;

if (!url) {
  console.error('[migrate] missing POSTGRES_URL_NON_POOLING (direct Neon endpoint).');
  process.exit(1);
}

async function main() {
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool);
  console.log('[migrate] applying drizzle migrations…');
  await migrate(db, { migrationsFolder: './drizzle/migrations' });
  await pool.end();
  console.log('[migrate] done.');
}

main().catch((err) => {
  console.error('[migrate] failed:', err);
  process.exit(1);
});
