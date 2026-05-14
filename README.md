# app-template

A pragmatic Next.js 15 + TypeScript SaaS starter. Auth, billing, credits,
i18n, queues, cron, R2 storage, email, and a UI kit — wired so you can
focus on your product instead of the plumbing.

Derived from a working production codebase. Every kept module either runs
as-is or is the smallest plausible scaffold for that concern. Anything
domain-specific has been peeled off and documented as an
[optional module](#optional-modules-not-installed-but-documented) so it
stays opt-in.

## Stack

| Layer            | Choice                                                                     |
| ---------------- | -------------------------------------------------------------------------- |
| Framework        | Next.js 15 (App Router, RSC + Server Actions), React 19                    |
| Language         | TypeScript 5.9, Node 24 LTS                                                |
| Styling          | Tailwind CSS v4, shadcn/ui, Radix UI primitives                            |
| Auth             | better-auth (email + OTP, Google OAuth, registration handshake)            |
| Database         | Neon Postgres (serverless), Drizzle ORM (HTTP + WebSocket pool drivers)    |
| Billing          | Stripe Checkout + Billing Portal + webhooks (subscription credits ledger)  |
| Storage          | Cloudflare R2 (S3-compatible) via `@aws-sdk/client-s3`                     |
| Email            | Resend with React-style templates                                          |
| Cache / Realtime | Upstash Redis (REST) for idempotency + rate limit; ioredis for SSE pub/sub |
| Queues           | `@vercel/queue` with idempotency-key envelopes                             |
| Cron             | `vercel.json` schedules → `/api/cron/*` (`Authorization: Bearer` guarded)  |
| i18n             | next-intl (App Router, locale prefix `as-needed`); en + zh seeded          |
| Tests            | Jest + Testing Library (unit), Playwright (e2e), Vitest (`@repo/db`)        |
| Lint / Format    | ESLint + `eslint-config-molindo`, Prettier, Stylelint                      |

## Layout

```
app-template/
├── packages/
│   └── db/                       # @repo/db — Drizzle schema, clients, authz
│       ├── src/
│       │   ├── client.ts         # getDbHttp() / getDbTransaction() — naming by use case
│       │   ├── authz.ts          # withUserScope() / requireOwnership()
│       │   ├── credits.ts        # atomic SQL primitives for the credits column
│       │   ├── migrate.ts        # tsx ./src/migrate.ts
│       │   ├── seed.ts           # placeholder seeder
│       │   ├── verify.ts         # `pnpm db:verify` — schema sanity check
│       │   └── schema/           # users, credit_grants, login_logs,
│       │                         # feedbacks, idempotency_keys,
│       │                         # pending_registrations, auth_*
│       ├── drizzle/
│       │   └── manual/           # hand-written setup_updated_at trigger SQL
│       └── test/                 # vitest specs (unit + optional integration)
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── [locale]/             # (marketing) / app / auth / 404 / [...rest]
│   │   ├── api/
│   │   │   ├── auth/[...all]     # better-auth catch-all
│   │   │   ├── auth/register/    # send-otp, verify-otp, complete
│   │   │   ├── billing/          # create-checkout-session, portal, pricing-config
│   │   │   ├── cron/             # idempotency cleanup, credit grants
│   │   │   ├── feedback/
│   │   │   ├── og/               # @vercel/og runtime image route
│   │   │   ├── queues/email-notification/
│   │   │   ├── user/profile/
│   │   │   ├── verify-info/
│   │   │   └── webhooks/stripe/
│   │   ├── manifest.ts / robots.ts / sitemap.ts
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                   # shadcn primitives
│   │   ├── app/                  # billing UI: credits-badge, upgrade-modal,
│   │   │                         # insufficient-credits-modal, feedback-alert/-modal,
│   │   │                         # topbar-shared
│   │   ├── brand/                # logo SVGs (replace with your own)
│   │   ├── dialogs/              # generic delete-dialog
│   │   ├── layout/               # skip-to-main-link, etc.
│   │   ├── marketing/            # navbar, footer
│   │   └── providers/            # ErrorHandlerProvider, QueryClientProvider
│   ├── config/                   # features.ts, icon.tsx, legal.ts, source-config.ts
│   ├── contexts/                 # auth, theme, user-data
│   ├── hooks/                    # use-billing-actions, use-pricing-config,
│   │                             # use-user-data, use-mobile, use-reduced-motion, …
│   ├── i18n/                     # routing.ts + request.ts (next-intl)
│   ├── lib/
│   │   ├── api/                  # callApi() + ApiError + response envelope
│   │   ├── auth/                 # client + server session helpers
│   │   ├── billing/              # plan types, Stripe portal helpers
│   │   ├── legal/                # marketing legal URLs
│   │   ├── realtime/             # SSE client
│   │   ├── storage/              # R2 upload/download + validateFile
│   │   └── utils/                # cn, format, validate, time, mailto, r2 url, …
│   ├── server/
│   │   ├── api/                  # auth, request, response helpers (handler layer)
│   │   ├── auth/                 # OTP, registration token (jose JWT)
│   │   ├── config/               # pricing.ts, runtime.ts
│   │   ├── dto/                  # wire-format DTOs (feedback, credit-grant)
│   │   ├── email/                # Resend client + templates + senders
│   │   ├── handlers/             # business logic per route
│   │   ├── lib/                  # logger, secrets, redis, idempotency, retry, r2, …
│   │   ├── loaders/              # RSC server loaders
│   │   ├── providers/            # 3rd-party SDK adapters (placeholder)
│   │   ├── queue/                # enqueue() helper for @vercel/queue
│   │   ├── realtime/             # publish() + createSseStream()
│   │   └── services/             # billing, credits, free-monthly-credits, user-data
│   ├── styles/                   # Tailwind v4 entry + variables
│   ├── instrumentation.ts        # Next.js instrumentation hook
│   └── middleware.ts             # next-intl + marketing CDN cache headers
├── messages/                     # en.json, zh.json (next-intl)
├── scripts/                      # guard-local-db, kill-ports
├── docs/
│   ├── api-route-testing-guide.md
│   ├── auth-security-best-practices.md
│   ├── backend-response-i18n-guideline.md
│   ├── pricing-credits-architecture-and-setup.md
│   └── optional-modules/         # opt-in integration guides (see below)
├── public/                       # logo, share/og, llms.txt, favicons
├── .cursor/rules/                # authoritative rules (security, architecture, etc.)
├── .env.vercel.example           # env contract for production / preview / dev
├── components.json               # shadcn config
├── eslint.config.mjs / prettier.config.cjs / .stylelintrc.json
├── jest.config.js / jest.setup.js / playwright.config.ts
├── next.config.js / postcss.config.js / tailwind.config.js
├── pnpm-workspace.yaml / package.json / vercel.json
└── tsconfig.json
```

## First-time setup

```bash
# 1. Install
pnpm install

# 2. Provision env
cp .env.vercel.example .env.local
# Fill the four required blocks: Postgres, Better-Auth, Stripe, Resend.
# R2 + Redis are required if you exercise storage/queues/SSE.

# 3. Bootstrap the DB (Neon)
pnpm db:generate          # produce drizzle/migrations/0000_*.sql
pnpm db:migrate           # apply it
psql "$POSTGRES_URL_NON_POOLING" \
  -f packages/db/drizzle/manual/0001_setup_updated_at_triggers.sql
pnpm db:verify            # sanity-check the schema

# 4. Boot
pnpm dev                  # http://localhost:3000
```

`pnpm dev` runs `scripts/guard-local-db.mjs` first — it refuses to start if
your local Postgres URL hits a host listed in `DB_GUARD_BLOCKED_HOSTS`
(empty by default, populate with prod host(s) so a misconfigured
`.env.local` cannot reach production).

## Daily commands

```bash
pnpm dev              # next dev (with local-db guard)
pnpm lint             # eslint + tsc + prettier (CI gate)
pnpm lint:fix         # auto-fix
pnpm test             # playwright e2e + jest unit
pnpm db:studio        # drizzle studio
pnpm -F @repo/db test  # vitest specs against optional dev branch
```

## Conventions worth knowing

- **Database is the source of truth.** Don't rename or wrap fields between
  DB → server → client. See
  [`.cursor/rules/data-structure-consistency.mdc`](.cursor/rules/data-structure-consistency.mdc).
- **Pick the right backend pattern.** Read
  [`.cursor/rules/architecture-decision-rules.mdc`](.cursor/rules/architecture-decision-rules.mdc)
  before reaching for a Route Handler. RSC + server loader is usually the
  right default for reads.
- **Secrets live in `.env*` only.** `NEXT_PUBLIC_*` is for non-sensitive
  configuration only (it ships to the browser). Server code may use
  `process.env` directly in Route Handlers; reuse
  `src/server/lib/secrets.ts` accessors for repeated reads.
- **Errors are user-safe.** Backend never returns raw `error.message` in
  HTTP responses; frontend never displays raw backend errors — both map
  through `ErrorMessages[code]` (`src/lib/utils/error-messages.ts`).
  See [`.cursor/rules/security-rules.mdc`](.cursor/rules/security-rules.mdc).
- **i18n is mandatory.** All user-facing copy goes through next-intl
  namespaces. Both `messages/en.json` and `messages/zh.json` must stay in
  sync.

The full rule set is in `.cursor/rules/` — Cursor surfaces the relevant
ones automatically while you edit.

## Optional modules (not installed, but documented)

The original codebase was used for an AI media product. Integrations that
are valuable but not core to a generic SaaS are dropped from this template
and documented in `docs/optional-modules/`. Each guide lists exact deps,
file shapes, and wire points so you can lift them in only when you need
them:

- **AI SDK + AI Gateway** — multi-provider LLM access via Vercel AI Gateway.
- **Vercel Workflow SDK** — durable, resumable, step-based workflows.
- **FAL provider** — server-side FAL inference + signed webhook handler.
- **Google Cloud Storage** — second storage backend alongside R2.
- **Blog system** — MDX content tree under `content/blog/`.
- **OG image build script** — `scripts/build-og-images.ts` baseline.
- **Realtime SSE** — extending the Redis pub/sub primitive into per-user channels.

Add new modules under `docs/optional-modules/` as you fork.

## Renaming for a new project

`app-template` and `@repo/db` are deliberate generic names. To rebrand:

1. Walk through [`RENAME.md`](RENAME.md) — the exact strings + paths to
   change live there.
2. Re-run `pnpm install && pnpm lint` to catch anything you missed.
3. Update `messages/en.json` + `messages/zh.json` marketing copy and OG
   content.
4. Replace logos under `src/components/brand/` and `public/logo/`.

## Deployment

The template targets Vercel (Fluid Compute is the default runtime).

- `vercel.json` declares the cron schedules and queue triggers.
- `pnpm build` runs `next build` directly.
- Environment variables: mirror `.env.vercel.example` in the Vercel
  project, marking secrets as **Sensitive**.
- Use a separate Neon branch per environment
  (`main` / `dev-ci` / `dev-<handle>`); see `packages/db/README.md`.
