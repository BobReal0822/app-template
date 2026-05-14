// Schema barrel — re-exported by `@app/db/schema` and consumed by
// drizzle-kit (`schema: './src/schema/index.ts'` in drizzle.config.ts).
//
// Tables are split across modules below so PR diffs stay reviewable and
// `git blame` stays readable as columns evolve.

export * from './users';
export * from './credit_grants';
export * from './login_logs';
export * from './feedbacks';
export * from './idempotency_keys';
export * from './pending_registrations';
export * from './auth';
