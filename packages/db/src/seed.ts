// Local development seed script.
// Usage: `pnpm db:seed` (root) → forwards to this script via dotenv.
//
// Placeholder so `pnpm -F @app/db check` and seed wiring stay green.
// Extend with real fixtures when local dev needs seeded rows.

async function main() {
  console.log('[seed] no-op — add fixtures here when needed.');
}

main().catch((err) => {
  console.error('[seed] failed:', err);
  process.exit(1);
});
