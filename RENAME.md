# Renaming `app-template` for a new project

This template ships with deliberate placeholders so a rebrand is a single
mechanical pass. Work through the checklist below in order; nothing here
needs cleverness, but skipping a step usually leaves a stale string in a
meta tag or an email footer.

## Variables you will pick

Fill these in once and use them when you walk the list.

| Placeholder            | Replace with                                     | Example          |
| ---------------------- | ------------------------------------------------ | ---------------- |
| `app-template`         | npm + folder name (kebab-case)                   | `acme-app`       |
| `App Template`         | display name (Title Case)                        | `Acme`           |
| `@app/db`              | DB workspace name (any pnpm scope works)         | `@acme/db`       |
| `app.example.com`      | production hostname                              | `app.acme.com`   |
| `your-bucket-prod`     | R2 bucket name (production)                      | `acme-prod`      |
| `your-bucket-staging`  | R2 bucket name (preview / dev)                   | `acme-staging`   |
| `noreply@example.com`  | default `From:` for transactional email          | `hello@acme.com` |

## Bulk rename

The bulk pass is one `perl` invocation. Run from the repo root:

```bash
APP_NAME="acme-app"
APP_TITLE="Acme"
DB_SCOPE="@acme/db"
APP_HOST="app.acme.com"
BUCKET_PROD="acme-prod"
BUCKET_STAGING="acme-staging"
EMAIL_FROM="hello@acme.com"

find . -type f \
  \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \
     -o -name '*.cjs' -o -name '*.json' -o -name '*.md' -o -name '*.mdx' \
     -o -name '*.mdc' -o -name '*.yaml' -o -name '*.yml' \
     -o -name '*.css' -o -name '*.scss' \) \
  ! -path './node_modules/*' ! -path './.next/*' \
  ! -path './packages/db/dist/*' \
  -exec perl -pi -e "
    s/\@app\/db/$DB_SCOPE/g;
    s/\bapp-template\b/$APP_NAME/g;
    s/\bApp Template\b/$APP_TITLE/g;
    s/app\.example\.com/$APP_HOST/g;
    s/noreply\@example\.com/$EMAIL_FROM/g;
    s/your-bucket-prod\b/$BUCKET_PROD/g;
    s/your-bucket-staging\b/$BUCKET_STAGING/g;
  " {} +
```

After running, refresh the lockfile and validate:

```bash
pnpm install
pnpm lint
pnpm -F "$DB_SCOPE" check
```

## Manual touches

Even after the bulk pass, walk these by hand — they hold artwork or
identity that can't be changed by a string substitution.

| Where                                        | Change                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/components/brand/`                      | Replace logo SVGs (`brand-logo.tsx`, `simple-logo.tsx`).                       |
| `public/logo/`                               | Drop in your own logo PNGs (light / dark variants).                            |
| `src/app/icon.png`, `src/app/apple-icon.png` | Replace favicons.                                                              |
| `src/app/manifest.ts`                        | Confirm PWA name, short_name, theme color.                                     |
| `src/middleware.ts`                          | If you have multiple domains, wire canonical-host redirects (commented stub).  |
| `src/lib/site-url.ts`                        | Confirm canonical hostname detection matches your deployment.                  |
| `messages/en.json`, `messages/zh.json`       | Rewrite marketing copy, hero/CTA strings, plan descriptions.                   |
| `src/app/api/og/_config.ts`                  | Replace OG headlines; regenerate or reuse static OG images.                    |
| `src/app/[locale]/(marketing)/`              | Update About / Privacy / Terms copy; ship the legal text your lawyer approves. |
| `src/server/email/templates/`                | Tweak email subject + greeting copy if you don't like the defaults.            |
| `src/server/config/pricing.ts`               | Wire your real Stripe price IDs and plan codes.                                |
| `vercel.json`                                | Adjust cron schedules + queue topics if you rename anything.                   |
| `.cursor/rules/`                             | Edit `architecture-decision-rules.mdc` etc. if your stack diverges.            |

## Don't forget

- Rotate any committed test secrets — there should be none, but
  double-check `.env*` is still in `.gitignore`.
- Move `packages/db/drizzle/manual/0001_setup_updated_at_triggers.sql`
  into `packages/db/drizzle/migrations/` (renaming to `0001_*.sql`) before
  the first `pnpm db:migrate` if you want triggers applied in the same
  pass.
- Re-run `pnpm db:generate` after you add your first domain table so the
  baseline migration covers it.
- Replace `app.example.com` with your real production hostname *also* in
  the `images.remotePatterns` allowlist of `next.config.js` if you serve
  any externally-hosted images.
