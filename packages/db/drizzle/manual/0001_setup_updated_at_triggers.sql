-- Auto-maintain `updated_at` on row mutation.
--
-- Drizzle does not declare DB triggers in TS schemas, so this lives as a
-- hand-written migration. Idempotent: function uses CREATE OR REPLACE,
-- triggers use DROP IF EXISTS + CREATE so re-applying against an existing
-- branch is safe.
--
-- Apply this AFTER `pnpm db:generate && pnpm db:migrate` has produced and
-- applied your `0000_*.sql`. Either:
--
--   1. Copy this file into `drizzle/migrations/` (renaming the prefix to
--      `0001_…`) before running `pnpm db:migrate`, OR
--   2. Apply once with `psql $POSTGRES_URL_NON_POOLING -f
--      packages/db/drizzle/manual/0001_setup_updated_at_triggers.sql`.
--
-- The kept template tables that need this trigger: `users`, `feedbacks`.
-- Add a `DROP/CREATE TRIGGER` pair for any new table that has an app-managed
-- `updated_at` column.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at_users ON "users";
--> statement-breakpoint
CREATE TRIGGER set_updated_at_users
BEFORE UPDATE ON "users"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
--> statement-breakpoint
DROP TRIGGER IF EXISTS set_updated_at_feedbacks ON "feedbacks";
--> statement-breakpoint
CREATE TRIGGER set_updated_at_feedbacks
BEFORE UPDATE ON "feedbacks"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
